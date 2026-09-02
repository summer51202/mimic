import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ExpenseForm } from "./expense-form";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const members = [{ user_id:"u1",display_name:"Mina",mimic_id:"MIMIC-2345-6789",role:"owner",status:"active" },{ user_id:"u2",display_name:"Alex",mimic_id:"MIMIC-3456-789A",role:"member",status:"active" }];
it("submits an equal expense with payer and split members", async () => {
 const user=userEvent.setup(); const success=vi.fn();
 const fetchMock=vi.fn((url:string, options?: RequestInit)=>{ void options; return Promise.resolve(new Response(JSON.stringify(url==="/api/auth/csrf"?{token:"t"}:{data:{id:"e1"}}),{status:200,headers:{"content-type":"application/json"}})); }); vi.stubGlobal("fetch",fetchMock);
 render(<ExpenseForm fundId="f1" currency="TWD" members={members} currentUserId="missing" onSuccess={success}/>);
 await user.type(screen.getByLabelText("Title"),"Dinner"); await user.type(screen.getByLabelText("Amount"),"12");
 expect(screen.getAllByText("Mina").at(-1)?.closest("li")).toHaveTextContent("NT$6.00");
 expect(screen.getAllByText("Alex").at(-1)?.closest("li")).toHaveTextContent("NT$6.00");
 await user.click(screen.getByRole("button",{name:"Add expense"})); await waitFor(()=>expect(success).toHaveBeenCalled());
 expect(fetchMock).toHaveBeenLastCalledWith("/api/app/funds/f1/expenses",expect.objectContaining({body:expect.stringContaining('"payer_user_id":"u1"')}));
});

it("submits fixed member amounts that equal the total", async () => {
 const user=userEvent.setup(); const success=vi.fn();
 const fetchMock=vi.fn((url:string, options?: RequestInit)=>{ void options; return Promise.resolve(new Response(JSON.stringify(url==="/api/auth/csrf"?{token:"t"}:{data:{id:"e2"}}),{status:200,headers:{"content-type":"application/json"}})); }); vi.stubGlobal("fetch",fetchMock);
 render(<ExpenseForm fundId="f1" currency="TWD" members={members} currentUserId="u1" onSuccess={success}/>);
 await user.type(screen.getByLabelText("Title"),"Tickets"); await user.type(screen.getByLabelText("Amount"),"12");
 await user.selectOptions(screen.getByLabelText("Split mode"),"fixed");
 await user.type(screen.getByLabelText("Mina share"),"5"); await user.type(screen.getByLabelText("Alex share"),"7");
 await user.click(screen.getByRole("button",{name:"Add expense"})); await waitFor(()=>expect(success).toHaveBeenCalled());
 const request=fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
 expect(JSON.parse(String(request.body))).toMatchObject({ split_mode:"fixed", splits:[{user_id:"u1",fixed_amount_minor:500},{user_id:"u2",fixed_amount_minor:700}] });
});

it("keeps values and reports payer total mismatch", async () => {
 const user=userEvent.setup(); vi.stubGlobal("fetch",vi.fn());
 render(<ExpenseForm fundId="f1" currency="TWD" members={members} currentUserId="u1" onSuccess={vi.fn()}/>);
 await user.type(screen.getByLabelText("Title"),"Dinner"); await user.type(screen.getByLabelText("Amount"),"12");
 await user.click(within(screen.getByRole("group", { name: "Who paid?" })).getByLabelText("Alex"));
 await user.type(screen.getByLabelText("Mina paid"),"5"); await user.type(screen.getByLabelText("Alex paid"),"5");
 await user.click(screen.getByRole("button",{name:"Add expense"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Payer amounts must equal");
 expect(screen.getByLabelText("Title")).toHaveValue("Dinner"); expect(fetch).not.toHaveBeenCalled();
});

it("keeps roster order when a participant is removed and reselected", async () => {
 const user=userEvent.setup();
 render(<ExpenseForm fundId="f1" currency="TWD" members={members} currentUserId="u1" onSuccess={vi.fn()}/>);
 await user.type(screen.getByLabelText("Amount"),"10.01");
 const participants=within(screen.getByRole("group", { name: "Who shares this expense?" }));

 await user.click(participants.getByLabelText("Mina"));
 await user.click(participants.getByLabelText("Mina"));

 expect(screen.getByText("NT$5.01").closest("li")).toHaveTextContent("Mina");
 expect(screen.getByText("NT$5.00").closest("li")).toHaveTextContent("Alex");
});
