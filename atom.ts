import { atom } from "jotai";
import { UserThread } from "@prisma/client";


export const userThreadAtom = atom<UserThread | null>(null);