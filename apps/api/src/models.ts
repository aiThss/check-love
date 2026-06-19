import mongoose, { Schema, Types } from "mongoose";

export type UserStatus = "active" | "blocked";
export type UserRole = "user" | "admin";
export type CheckInType = "photo" | "text" | "mood";
export type ReactionType = "heart" | "hug" | "kiss" | "laugh" | "miss";

export interface IUser {
  displayName: string;
  partnerName: string;
  email?: string;
  passwordHash?: string;
  emailVerified: boolean;
  avatarUrl?: string;
  partnerAvatarUrl?: string;
  trustedDevices: string[];
  role: UserRole;
  status: UserStatus;
  coupleId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICouple {
  code: string;
  loveStartDate: Date;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IReaction {
  userId: Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
}

export interface ICheckIn {
  coupleId: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerName: string;
  type: CheckInType;
  imageUrl?: string;
  storagePath?: string;
  caption?: string;
  mood?: string;
  quickMessage?: string;
  reactions: IReaction[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRandomEvent {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  category: string;
  prompt: string;
  detail?: string;
  createdAt: Date;
}

export interface IPushSubscription {
  userId: Types.ObjectId;
  coupleId: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOtpCode {
  email: string;
  purpose: "register" | "login";
  codeHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    displayName: { type: String, required: true, trim: true },
    partnerName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    passwordHash: String,
    emailVerified: { type: Boolean, default: false },
    avatarUrl: String,
    partnerAvatarUrl: String,
    trustedDevices: { type: [String], default: [] },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true }
  },
  { timestamps: true }
);

const coupleSchema = new Schema<ICouple>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    loveStartDate: { type: Date, required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const reactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["heart", "hug", "kiss", "laugh", "miss"], required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const checkInSchema = new Schema<ICheckIn>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerName: { type: String, required: true },
    type: { type: String, enum: ["photo", "text", "mood"], required: true },
    imageUrl: String,
    storagePath: String,
    caption: String,
    mood: String,
    quickMessage: String,
    reactions: { type: [reactionSchema], default: [] },
    deletedAt: Date
  },
  { timestamps: true }
);

const randomEventSchema = new Schema<IRandomEvent>({
  coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  prompt: { type: String, required: true },
  detail: String,
  createdAt: { type: Date, default: Date.now }
});

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: String
  },
  { timestamps: true }
);

const otpCodeSchema = new Schema<IOtpCode>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ["register", "login"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: Date,
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

checkInSchema.index({ coupleId: 1, createdAt: -1 });
randomEventSchema.index({ coupleId: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export const Couple = mongoose.models.Couple || mongoose.model<ICouple>("Couple", coupleSchema);
export const CheckIn = mongoose.models.CheckIn || mongoose.model<ICheckIn>("CheckIn", checkInSchema);
export const RandomEvent =
  mongoose.models.RandomEvent || mongoose.model<IRandomEvent>("RandomEvent", randomEventSchema);
export const PushSubscription =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", pushSubscriptionSchema);
export const OtpCode = mongoose.models.OtpCode || mongoose.model<IOtpCode>("OtpCode", otpCodeSchema);
