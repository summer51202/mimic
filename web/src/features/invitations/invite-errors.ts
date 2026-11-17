import zh from "@/i18n/messages/zh-TW.json";
import { AppClientError } from "@/shared/api/app-fetch";

export const inviteMessages = zh.invite.errors;

export type InviteErrorCode = keyof typeof inviteMessages;

export function inviteErrorMessage(error: unknown): string {
  return inviteMessages[inviteErrorKey(error)];
}

export function inviteErrorKey(error: unknown): InviteErrorCode {
  if (error instanceof AppClientError && isInviteErrorCode(error.code)) {
    return error.code;
  }

  return "unavailable";
}

function isInviteErrorCode(code: string): code is InviteErrorCode {
  return Object.hasOwn(inviteMessages, code);
}
