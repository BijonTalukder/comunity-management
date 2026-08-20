import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type UserDoc } from "@/models/User";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import type { Actor } from "@/lib/actor";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from "@/validations/user.schema";
import type { Paginated } from "@/types";

export type SafeUser = Omit<UserDoc, "passwordHash">;

const USER_SORT_FIELDS = ["name", "email", "role", "createdAt", "lastLoginAt"] as const;
const USER_TRACKED_FIELDS = ["name", "email", "role", "isActive"] as const;

export async function listUsers(query: UserListQuery): Promise<Paginated<SafeUser>> {
  await connectToDatabase();

  const filter: QueryFilter<UserDoc> = {};
  if (query.role) filter.role = query.role;
  if (query.isActive) filter.isActive = query.isActive === "true";
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const sort = buildSort(query.sortBy, query.sortOrder, USER_SORT_FIELDS, "createdAt");

  const [items, total] = await Promise.all([
    // `passwordHash` is `select: false`, so it is excluded automatically.
    User.find(filter)
      .sort({ ...sort, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<SafeUser[]>(),
    User.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

export async function getUserById(id: string): Promise<SafeUser> {
  await connectToDatabase();
  const user = await User.findById(toObjectId(id, "User")).lean<SafeUser>();
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function createUser(input: CreateUserInput, actor: Actor): Promise<SafeUser> {
  await connectToDatabase();

  const existing = await User.findOne({ email: input.email }).select("_id").lean();
  if (existing) {
    throw new ConflictError("An account with this email already exists", [
      { field: "email", message: "This email is already registered" },
    ]);
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    isActive: input.isActive,
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "User",
    entityId: user._id,
    entityLabel: `${user.name} <${user.email}>`,
    action: "CREATE",
    changes: [
      { field: "name", oldValue: null, newValue: user.name },
      { field: "email", oldValue: null, newValue: user.email },
      { field: "role", oldValue: null, newValue: user.role },
      { field: "isActive", oldValue: null, newValue: user.isActive },
    ],
    context: actor,
  });

  const { passwordHash: _hash, ...safe } = user.toObject();
  void _hash;
  return safe as SafeUser;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: Actor,
): Promise<SafeUser> {
  await connectToDatabase();
  const userId = toObjectId(id, "User");

  const previous = await User.findById(userId).lean<SafeUser>();
  if (!previous) throw new NotFoundError("User");

  const isSelf = String(previous._id) === actor.id;

  // Guards that keep the system from locking every super admin out.
  if (isSelf && input.isActive === false) {
    throw new AppError("You cannot deactivate your own account", 400);
  }
  if (isSelf && input.role && input.role !== previous.role) {
    throw new AppError("You cannot change your own role", 400);
  }

  const losesSuperAdmin =
    previous.role === "SUPER_ADMIN" &&
    ((input.role && input.role !== "SUPER_ADMIN") || input.isActive === false);

  if (losesSuperAdmin) {
    const remaining = await User.countDocuments({
      _id: { $ne: userId },
      role: "SUPER_ADMIN",
      isActive: true,
    });
    if (remaining === 0) {
      throw new AppError("At least one active super admin must remain", 400);
    }
  }

  const changes = getChangedFields(
    previous,
    input,
    USER_TRACKED_FIELDS,
  );

  const patch: Record<string, unknown> = {
    name: input.name,
    role: input.role,
    isActive: input.isActive,
    updatedBy: new Types.ObjectId(actor.id),
  };

  if (input.password) {
    patch.passwordHash = await hashPassword(input.password);
    // Invalidates any session issued before this reset.
    patch.passwordChangedAt = new Date();
    changes.push({ field: "password", oldValue: null, newValue: "(reset by admin)" });
  }

  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) delete patch[key];
  }

  if (changes.length === 0) return previous;

  const updated = await User.findByIdAndUpdate(userId, patch, {
    new: true,
    runValidators: true,
  }).lean<SafeUser>();

  if (!updated) throw new NotFoundError("User");

  await createAuditLog({
    entityType: "User",
    entityId: userId,
    entityLabel: `${updated.name} <${updated.email}>`,
    action: input.password ? "PASSWORD_CHANGE" : "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}
