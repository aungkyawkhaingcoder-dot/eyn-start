import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";


//createUser

export const createUser = async (data: {
  phone: string;
  phoneVerifiedAt?: Date;
  password: string;
  randomToken: string;
}) => {
  return await prisma.user.create({
    data
  })
}


export const updateUser = async (id: number, data: Prisma.UserUpdateInput) => {
  return await prisma.user.update({
    where: { id },
    data,
  });
};

export const getUserByPhone = async (phone: string): Promise<Prisma.UserGetPayload<{}> | null> => {
  return await prisma.user.findUnique({ where: { phone } });
};

export const getUserById = async (id: number): Promise<Prisma.UserGetPayload<{}> | null> => {
  return await prisma.user.findUnique({ where: { id } });
};


export const createOtpData = async (otpdata: Prisma.OtpCreateInput) => {
  return await prisma.otp.create({
    data: otpdata
  })
}

export const updateOtpData = async (id: number, data: Prisma.OtpUpdateInput) => {
  return await prisma.otp.update({
    where: { id },
    data,
  });
};

export const getOtpByPhone = async (phone: string) => {
  return await prisma.otp.findUnique({ where: { phone } });
}

// Compare-and-swap prevents concurrent refreshes from both consuming one token.
export const replaceRefreshToken = async (id: number, previous: string, replacement: string) => {
  const result = await prisma.user.updateMany({
    where: { id, randomToken: previous },
    data: { randomToken: replacement },
  });
  return result.count === 1;
};
