import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntlTestProvider, render } from "@/test/render-with-intl";
import { AppClientError, appFetch } from "@/shared/api/app-fetch";

import { AvatarPicker } from "./avatar-picker";

vi.mock("@/shared/api/app-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/app-fetch")>()),
  appFetch: vi.fn(),
}));
const appFetchMock = vi.mocked(appFetch);

const names = ["戰士", "法師", "遊俠", "盜賊", "鍊金術士", "吟遊詩人", "製圖師", "醫者"];

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

beforeEach(() => {
  appFetchMock.mockReset();
  setOnline(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFirst(overrides: Partial<Parameters<typeof AvatarPicker>[0]> = {}) {
  const props = { onChosen: vi.fn(), onClose: vi.fn(), onDismissed: vi.fn(), ...overrides };
  render(<AvatarPicker initialClass={null} mode="first" {...props} />);
  return props;
}

describe("AvatarPicker", () => {
  it("offers the eight classes as one radio group with decorative portraits", () => {
    renderFirst();

    expect(screen.getByRole("dialog", { name: "選擇你的職業" })).toBeInTheDocument();
    expect(screen.getByText("職業只會改變你在 mimic 裡的樣子，之後隨時可以在設定更改。")).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: "選擇你的職業" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.textContent)).toEqual(names);
    expect(radios.every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
    expect(within(group).queryAllByRole("img")).toEqual([]);
    expect(group.querySelectorAll('img[alt=""]')).toHaveLength(8);
    expect(group.querySelector("img")).toHaveAttribute("src", "/pixel-ui/v1/avatars/warrior-portrait.png");
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1, -1]);
    expect(screen.getByRole("button", { name: "決定" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "之後再說" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "取消" })).not.toBeInTheDocument();
  });

  it("moves the selection with arrow keys and wraps around", async () => {
    const user = userEvent.setup();
    renderFirst();
    const radios = screen.getAllByRole("radio");

    await user.click(radios[0]);
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(radios[2]).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowUp}");
    expect(radios[7]).toHaveAttribute("aria-checked", "true");
    expect(radios[7]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(radios[7]).toHaveAttribute("aria-checked", "true");
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, -1, -1, -1, -1, -1, 0]);
  });

  it("saves the chosen class and hands back the server value", async () => {
    const user = userEvent.setup();
    appFetchMock.mockResolvedValueOnce({ data: { avatar_class: "bard" } });
    const props = renderFirst();

    await user.click(screen.getByRole("radio", { name: "吟遊詩人" }));
    await user.click(screen.getByRole("button", { name: "決定" }));

    expect(appFetchMock).toHaveBeenCalledWith("/api/app/me", {
      method: "PATCH", body: JSON.stringify({ avatar_class: "bard" }),
    });
    await waitFor(() => expect(props.onChosen).toHaveBeenCalledWith("bard"));
    expect(props.onDismissed).not.toHaveBeenCalled();
  });

  it("records 之後再說 on the server", async () => {
    const user = userEvent.setup();
    appFetchMock.mockResolvedValueOnce({ data: { avatar_class: null, avatar_prompt_dismissed: true } });
    const props = renderFirst();

    await user.click(screen.getByRole("button", { name: "之後再說" }));

    expect(appFetchMock).toHaveBeenCalledWith("/api/app/me", {
      method: "PATCH", body: JSON.stringify({ avatar_prompt_dismissed: true }),
    });
    await waitFor(() => expect(props.onDismissed).toHaveBeenCalledOnce());
    expect(props.onChosen).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with an error when saving fails", async () => {
    const user = userEvent.setup();
    appFetchMock.mockRejectedValueOnce(new AppClientError(503, "UPSTREAM_UNAVAILABLE"));
    const props = renderFirst();

    await user.click(screen.getByRole("radio", { name: "醫者" }));
    await user.click(screen.getByRole("button", { name: "決定" }));

    expect(await screen.findByText("職業還沒儲存，請稍後再試。")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "醫者" })).toHaveAttribute("aria-checked", "true");
    expect(props.onChosen).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("disables both actions while offline and says so", async () => {
    setOnline(false);
    const user = userEvent.setup();
    renderFirst({ initialClass: "mage" });

    expect(screen.getByRole("status")).toHaveTextContent("目前離線；已確認資料維持不變。");
    expect(screen.getByRole("button", { name: "決定" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "之後再說" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "戰士" }));
    expect(screen.getByRole("radio", { name: "法師" })).toHaveAttribute("aria-checked", "true");
    expect(appFetchMock).not.toHaveBeenCalled();
  });

  it("offers 取消 instead of 之後再說 when changing from Settings", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AvatarPicker initialClass="cartographer" mode="change" onChosen={vi.fn()} onClose={onClose} />);

    expect(screen.getByRole("radio", { name: "製圖師" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "決定" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "之後再說" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(appFetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "Choose your class", "Choose", "Later", "Warrior"],
    ["ja", "職業を選ぶ", "決定", "あとで", "戦士"],
  ] as const)("is translated in %s", (locale, title, confirm, later, warrior) => {
    render(<AvatarPicker initialClass={null} mode="first" onChosen={vi.fn()} onClose={vi.fn()} />, {
      wrapper: ({ children }) => <IntlTestProvider locale={locale}>{children}</IntlTestProvider>,
    });
    expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: confirm })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: later })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: warrior })).toBeInTheDocument();
  });
});
