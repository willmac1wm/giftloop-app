import React, { useState } from "react";
import { addExchangeToCalendar, scheduleLocalReminder } from "../native/shell";

export default function ExchangeDateActions({ id, title, date }) {
  const [notice, setNotice] = useState("");

  const run = async (work) => {
    const result = await work();
    setNotice(result.reason || (result.added ? "Calendar file ready." : result.scheduled ? "Reminder set for the day before." : ""));
  };

  if (!date) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        className="btn btn-secondary text-xs"
        onClick={() => run(() => addExchangeToCalendar({
          title: title || "Secret Gifter exchange",
          date,
          details: "Secret Gifter exchange date. The file does not include who anyone is buying for.",
        }))}
      >
        Add date to calendar
      </button>
      <button
        type="button"
        className="btn btn-secondary text-xs"
        onClick={() => run(() => scheduleLocalReminder({ id, title, date }))}
      >
        Remind me on this phone
      </button>
      {notice && <p className="text-xs text-slate-400">{notice}</p>}
    </div>
  );
}
