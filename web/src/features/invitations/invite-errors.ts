import { AppClientError } from "@/shared/api/app-fetch";

export const inviteMessages = {
  INVITE_NOT_FOUND: "這個邀請不存在或已失效。",
  INVITE_ALREADY_USED: "這個邀請已經使用過。",
  INVITE_EXPIRED: "這個邀請已過期，請管理者重新產生。",
  INVITE_EMAIL_MISMATCH: "請使用受邀的電子郵件帳號登入。",
  ALREADY_GROUP_MEMBER: "你已經是這個群組的成員。",
} as const;

export type InviteErrorCode = keyof typeof inviteMessages;

export function inviteErrorMessage(error: unknown): string {
  if (error instanceof AppClientError && isInviteErrorCode(error.code)) {
    return inviteMessages[error.code];
  }

  return "服務暫時沒有回應，請稍後再送出一次。咪咪庫先幫你保留表單內容。";
}

function isInviteErrorCode(code: string): code is InviteErrorCode {
  return code in inviteMessages;
}
