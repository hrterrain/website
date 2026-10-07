/* HR Terrain · compliance calendar as a Word document.
   Shared by the website (window.HRTCalendarDoc) and tests (module.exports).
   build(docx, opts) returns a docx.Document.
   opts: { company, states:[], events:[{date, title, desc, applies}], logo:Uint8Array, today:Date } */
(function (root) {
  "use strict";

  var NAVY = "0F3473", INK = "14233D", MUTED = "4B5B77", RULE = "E1E8F1", TINT = "FAF8F3", ACCENT = "17458F", RED = "C23B25";
  var ML = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var FONT = "Arial";

  function build(d, o) {
    var W = 9746;                                   // A4 width minus 0.75" margins, in DXA
    var COLS = [1150, 2500, 3346, 1850, 900];       // due · obligation · what to do · applies to · done
    var none = { style: d.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    var noBorders = { top: none, bottom: none, left: none, right: none };
    var line = { style: d.BorderStyle.SINGLE, size: 4, color: RULE };

    function run(text, x) { return new d.TextRun(Object.assign({ text: text, font: FONT, size: 20, color: INK }, x || {})); }
    function para(children, x) { return new d.Paragraph(Object.assign({ children: children, spacing: { after: 0 } }, x || {})); }

    var events = o.events.slice().sort(function (a, b) { return a.date - b.date; });
    var first = events[0].date, last = events[events.length - 1].date;
    var period = ML[first.getMonth()] + " " + first.getFullYear() + " to " + ML[last.getMonth()] + " " + last.getFullYear();
    var today = o.today || new Date();
    var prepared = today.getDate() + " " + ML[today.getMonth()] + " " + today.getFullYear();
    var company = (o.company || "").trim();

    /* ---------- title block ---------- */
    var titleBlock = new d.Table({
      width: { size: W, type: d.WidthType.DXA }, columnWidths: [2000, W - 2000], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [new d.TableRow({ children: [
        new d.TableCell({ width: { size: 2000, type: d.WidthType.DXA }, borders: noBorders, verticalAlign: d.VerticalAlign.CENTER,
          children: [para(o.logo ? [new d.ImageRun({ type: "png", data: o.logo, transformation: { width: 104, height: 77 }, altText: { title: "HR Terrain", description: "HR Terrain logo", name: "logo" } })] : [run("HR Terrain", { bold: true, color: NAVY, size: 28 })])] }),
        new d.TableCell({ width: { size: W - 2000, type: d.WidthType.DXA }, borders: noBorders, verticalAlign: d.VerticalAlign.CENTER,
          children: [
            para([run("STATUTORY COMPLIANCE CALENDAR", { bold: true, size: 17, color: ACCENT, characterSpacing: 40 })], { spacing: { after: 60 } }),
            para([run(company ? company : "Your compliance calendar", { bold: true, size: 40, color: NAVY })], { spacing: { after: 60 } }),
            para([run(period + "  ·  " + (o.states.length ? o.states.join(", ") : "All states"), { size: 20, color: MUTED })])
          ] })
      ] })]
    });

    var intro = [
      para([], { border: { bottom: { style: d.BorderStyle.SINGLE, size: 12, color: NAVY, space: 1 } }, spacing: { before: 120, after: 200 } }),
      para([
        run(events.length + " deadlines", { bold: true, color: NAVY }),
        run(" over the next 12 months, grouped by month. Tick each one as it's filed. Prepared " + prepared + ".", { color: MUTED })
      ], { spacing: { after: 280 } })
    ];

    /* ---------- one table per month ---------- */
    function cell(children, width, x) {
      return new d.TableCell(Object.assign({
        width: { size: width, type: d.WidthType.DXA }, children: children,
        margins: { top: 100, bottom: 100, left: 110, right: 110 },
        borders: { top: none, left: none, right: none, bottom: line }
      }, x || {}));
    }
    function headRow() {
      var labels = ["DUE", "OBLIGATION", "WHAT TO DO", "APPLIES TO", "DONE"];
      return new d.TableRow({ tableHeader: true, cantSplit: true, children: labels.map(function (t, i) {
        return cell([para([run(t, { bold: true, size: 15, color: "FFFFFF", characterSpacing: 20 })], { alignment: i === 4 ? d.AlignmentType.CENTER : d.AlignmentType.LEFT })], COLS[i],
          { shading: { type: d.ShadingType.CLEAR, color: "auto", fill: NAVY }, borders: { top: none, left: none, right: none, bottom: none } });
      }) });
    }

    var byMonth = [];
    events.forEach(function (ev) {
      var k = ev.date.getFullYear() * 12 + ev.date.getMonth(), g = byMonth[byMonth.length - 1];
      if (!g || g.k !== k) byMonth.push(g = { k: k, date: ev.date, list: [] });
      g.list.push(ev);
    });

    var body = [];
    byMonth.forEach(function (g) {
      body.push(para([
        run(ML[g.date.getMonth()] + " " + g.date.getFullYear(), { bold: true, size: 28, color: NAVY }),
        run("   " + g.list.length + (g.list.length === 1 ? " deadline" : " deadlines"), { size: 18, color: MUTED })
      ], { keepNext: true, spacing: { before: 240, after: 110 } }));

      var rows = [headRow()];
      g.list.forEach(function (ev, i) {
        var dd = ev.date, weekend = dd.getDay() === 0 || dd.getDay() === 6;
        var fill = i % 2 ? { shading: { type: d.ShadingType.CLEAR, color: "auto", fill: TINT } } : {};
        rows.push(new d.TableRow({ cantSplit: true, children: [
          cell([
            para([run(String(dd.getDate()).padStart(2, "0") + " " + MS[dd.getMonth()], { bold: true, color: RED, size: 21 })]),
            para([run(WD[dd.getDay()] + (weekend ? " · check for shift" : ""), { size: 15, color: MUTED })])
          ], COLS[0], fill),
          cell([para([run(ev.title, { bold: true, color: NAVY, size: 20 })])], COLS[1], fill),
          cell([para([run(ev.desc, { size: 18, color: INK })])], COLS[2], fill),
          cell([para([run(ev.applies || "", { size: 17, color: MUTED })])], COLS[3], fill),
          cell([para([run("☐", { size: 26, color: NAVY })], { alignment: d.AlignmentType.CENTER })], COLS[4], Object.assign({ verticalAlign: d.VerticalAlign.CENTER }, fill))
        ] }));
      });
      body.push(new d.Table({ width: { size: W, type: d.WidthType.DXA }, columnWidths: COLS, rows: rows,
        borders: { top: none, left: none, right: none, bottom: none, insideHorizontal: none, insideVertical: none } }));
    });

    /* ---------- closing notes ---------- */
    var notes = [
      para([run("Notes", { bold: true, size: 24, color: NAVY })], { keepNext: true, spacing: { before: 400, after: 100 } }),
      para([run("General reference, not legal advice. Due dates move when they fall on a holiday or when authorities issue extensions, and applicability depends on your state, establishment type, headcount and wage structure. Some Professional Tax and POSH report dates vary by local body or district: confirm yours.", { size: 17, color: MUTED })], { spacing: { after: o.pending && o.pending.length ? 120 : 240 } }),
    ].concat(o.pending && o.pending.length ? [
      para([run("Dates we'll confirm with you: ", { bold: true, size: 17, color: INK }), run(o.pending.join("; ") + ". These are levied in your state, but the payment schedule depends on your registration, so they aren't listed above.", { size: 17, color: MUTED })], { spacing: { after: 240 } })
    ] : []).concat([
      para([run("Want these filings handled for you?", { bold: true, size: 22, color: NAVY })], { keepNext: true, spacing: { after: 60 } }),
      para([run("HR Terrain runs HR operations, payroll and statutory compliance for employers across India.", { size: 18, color: INK })], { keepNext: true, spacing: { after: 60 } }),
      para([
        run("abhiraj@hrterrain.com", { bold: true, size: 18, color: NAVY }),
        run("   ·   WhatsApp +91 99950 94978   ·   hrterrain.com", { size: 18, color: INK })
      ])
    ]);

    var footer = new d.Footer({ children: [para([
      run("HR Terrain · Navigator of HR landscape", { size: 15, color: MUTED }),
      new d.TextRun({ children: [new d.Tab(), "Page "], font: FONT, size: 15, color: MUTED }),
      new d.TextRun({ children: [d.PageNumber.CURRENT], font: FONT, size: 15, color: MUTED }),
      new d.TextRun({ text: " of ", font: FONT, size: 15, color: MUTED }),
      new d.TextRun({ children: [d.PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUTED })
    ], { style: "HrtFooter", tabStops: [{ type: d.TabStopType.RIGHT, position: W }], border: { top: { style: d.BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } } })] });

    return new d.Document({
      creator: "HR Terrain", title: (company ? company + " · " : "") + "Statutory compliance calendar", description: "Statutory compliance deadlines, " + period,
      styles: { default: { document: { run: { font: FONT, size: 20 } } },
        paragraphStyles: [{ id: "HrtFooter", name: "HR Terrain footer", basedOn: "Normal", run: { font: FONT, size: 15, color: MUTED } }] },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1080, right: 1080, footer: 500 } } },
        footers: { default: footer },
        children: [titleBlock].concat(intro, body, notes)
      }]
    });
  }

  /* ---------- state rules: Professional Tax and Labour Welfare Fund ----------
     pt / lwf:  null      not levied
                "check"   levied, but the schedule depends on the registration or is not confirmed: we confirm it with the client
                { m:day }                         monthly, by this day of the next month (0 = last day)
                { h:[[month, day, period], ...] } fixed dates (month is 0-based)
     amt: per-employee contribution, only where it is settled. Last reviewed October 2026. */
  var JUL_JAN = [[6, 15, "January to June"], [0, 15, "July to December"]];
  var STATES = [
    ["AN", "Andaman and Nicobar Islands", "check", null],
    ["AP", "Andhra Pradesh", { m: 10 }, { h: [[0, 31, "the previous calendar year"]], amt: "₹30 employee + ₹70 employer" }],
    ["AR", "Arunachal Pradesh", null, null],
    ["AS", "Assam", "check", null],
    ["BR", "Bihar", "check", null],
    ["CH", "Chandigarh", null, "check"],
    ["CG", "Chhattisgarh", null, { h: JUL_JAN }],
    ["DN", "Dadra and Nagar Haveli and Daman and Diu", "check", null],
    ["DL", "Delhi", null, { h: JUL_JAN }],
    ["GA", "Goa", "check", "check"],
    ["GJ", "Gujarat", { m: 15, note: " Smaller employers may be on a quarterly cycle." }, { h: JUL_JAN, amt: "₹6 employee + ₹12 employer" }],
    ["HR", "Haryana", null, "check"],
    ["HP", "Himachal Pradesh", null, null],
    ["JK", "Jammu and Kashmir", "check", null],
    ["JH", "Jharkhand", "check", null],
    ["KA", "Karnataka", { m: 20 }, "KA"],
    ["KL", "Kerala", { h: [[7, 31, "April to September"], [1, 0, "October to March"]], note: " Confirm the date with your municipality or panchayat." }, "KL"],
    ["LA", "Ladakh", null, null],
    ["LD", "Lakshadweep", "check", null],
    ["MP", "Madhya Pradesh", "check", { h: JUL_JAN }],
    ["MH", "Maharashtra", { m: 15 }, { h: JUL_JAN, amt: "₹25 employee + ₹75 employer" }],
    ["MN", "Manipur", "check", null],
    ["ML", "Meghalaya", "check", null],
    ["MZ", "Mizoram", "check", null],
    ["NL", "Nagaland", "check", null],
    ["OD", "Odisha", { m: 0 }, { h: JUL_JAN }],
    ["PY", "Puducherry", "check", null],
    ["PB", "Punjab", "check", "check"],
    ["RJ", "Rajasthan", null, null],
    ["SK", "Sikkim", "check", null],
    ["TN", "Tamil Nadu", { h: [[8, 30, "April to September"], [2, 31, "October to March"]] }, { h: [[0, 31, "the previous calendar year"]], amt: "₹20 employee + ₹40 employer" }],
    ["TG", "Telangana", { m: 10 }, { h: [[0, 31, "the previous calendar year"]] }],
    ["TR", "Tripura", "check", null],
    ["UP", "Uttar Pradesh", null, null],
    ["UK", "Uttarakhand", null, null],
    ["WB", "West Bengal", { m: 21 }, { h: JUL_JAN }]
  ].map(function (r) { return { code: r[0], name: r[1], pt: r[2], lwf: r[3] }; });
  var BY = {};
  STATES.forEach(function (st) { BY[st.code] = st; });
  function nth(n) { return n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"); }
  // plain-English schedule, for the applicability checker
  function schedule(spec) {
    if (!spec || typeof spec !== "object") return "";
    if (spec.m != null) return spec.m ? "monthly, by the " + nth(spec.m) + " of the following month" : "monthly, by the end of the following month";
    return (spec.h.length > 1 ? "half-yearly" : "once a year") + ", by " + spec.h.map(function (h) { return (h[1] || "end of") + " " + ML[h[0]]; }).join(" and ");
  }
  // obligations that are levied in the chosen states but need their dates confirmed
  function pending(states, laws) {
    var out = [];
    states.forEach(function (c) {
      var st = BY[c]; if (!st) return;
      if (laws.indexOf("pt") > -1 && st.pt === "check") out.push(st.name + " Professional Tax");
      if (laws.indexOf("lwf") > -1 && st.lwf === "check") out.push(st.name + " Labour Welfare Fund");
    });
    return out;
  }

  /* the next 12 months of deadlines for the chosen states and obligations.
     states: state codes ([] = central obligations only)
     est: Kerala establishment types ("shop", "factory", "plantation"); decides which Kerala LWF rows apply */
  function deadlines(states, laws, now, est) {
    var has = function (v, a) { return a.indexOf(v) > -1; }, out = [];
    var KL = has("KL", states), KA = has("KA", states);
    est = est || ["shop"];
    var klShop = KL && has("shop", est), klBoard = KL && (has("factory", est) || has("plantation", est));
    now = now || new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), until = new Date(today);
    until.setFullYear(until.getFullYear() + 1);
    function prev(m) { return ML[(m + 11) % 12]; }
    function last(y, m) { return new Date(y, m + 1, 0).getDate(); }
    function add(y, m, d, title, desc, applies, tag) {
      var dt = new Date(y, m, d || last(y, m));
      if (dt >= today && dt < until) out.push({ date: dt, title: title, desc: desc, applies: applies, tag: tag });
    }
    var picked = states.map(function (c) { return BY[c]; }).filter(Boolean);
    for (var i = 0; i < 13; i++) {
      var y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12), m = (today.getMonth() + i) % 12;
      if (has("wages", laws)) add(y, m, 7, "Salaries paid", prev(m) + " wages must be paid by the 7th under the Code on Wages.", "All employers", "Wages");
      if (has("tds", laws)) add(y, m, m === 3 ? 30 : 7, "TDS deposit on salaries", "Deposit tax deducted from " + prev(m) + " salaries." + (m === 3 ? " March deductions are due by 30 April." : ""), "Employers deducting TDS", "TDS");
      if (has("epf", laws)) add(y, m, 15, "EPF: ECR filing and payment", "File the ECR and pay employer and employee PF for " + prev(m) + " wages.", "Establishments covered by EPF", "EPF");
      if (has("esi", laws)) add(y, m, 15, "ESI contribution", "Pay employer and employee ESI share for " + prev(m) + " wages.", "Establishments covered by ESI", "ESIC");
      picked.forEach(function (st) {
        if (has("pt", laws) && st.pt && st.pt.m != null)
          add(y, m, st.pt.m, "Professional Tax", "Pay PT deducted from " + prev(m) + " salaries." + (st.code === "KA" && m === 2 ? " February deduction is ₹300." : "") + (st.pt.note || ""), st.name, st.name + " PT");
      });
      if (has("lwf", laws) && klShop) add(y, m, 5, "Peedika welfare fund", "Pay ₹50 employee + ₹50 employer per employee for " + prev(m) + " to the Kerala Shops and Commercial Establishments Workers Welfare Fund Board.", "Kerala · shops and commercial establishments", "Kerala LWF");
    }
    for (var yy = today.getFullYear() - 1; yy <= today.getFullYear() + 1; yy++) {
      if (has("tds", laws)) {
        [[6, 31, "April to June"], [9, 31, "July to September"], [0, 31, "October to December"], [4, 31, "January to March"]].forEach(function (q) {
          add(yy, q[0], q[1], "Quarterly TDS return", "File the salary TDS statement (Form 138, earlier Form 24Q) for " + q[2] + ".", "Employers deducting TDS", "TDS");
        });
        add(yy, 5, 15, "Form 130 to employees", "Issue annual salary TDS certificates (Form 130, earlier Form 16) for the previous financial year.", "Employers deducting TDS", "TDS");
      }
      if (has("wages", laws)) add(yy, 3, 1, "Revised minimum wages / VDA", "Apply any minimum wage or VDA revision notified from 1 April.", "All employers", "Wages");
      picked.forEach(function (st) {
        if (has("pt", laws) && st.pt && st.pt.h) st.pt.h.forEach(function (h) {
          add(yy, h[0], h[1], "Professional Tax", "Pay PT for " + h[2] + "." + (st.pt.note || ""), st.name, st.name + " PT");
        });
        if (has("lwf", laws) && st.lwf && st.lwf.h) st.lwf.h.forEach(function (h) {
          add(yy, h[0], h[1], "Labour Welfare Fund", "Remit employee and employer contributions for " + h[2] + (st.lwf.amt ? ": " + st.lwf.amt + " per employee." : " at the rate your state Board notifies."), st.name, st.name + " LWF");
        });
      });
      if (has("lwf", laws) && KA) {
        add(yy, 11, 31, "Labour Welfare Fund: deduct", "Deduct the ₹50 employee share from December wages.", "Karnataka", "Karnataka LWF");
        add(yy, 0, 15, "Labour Welfare Fund: pay", "Remit ₹50 employee + ₹100 employer per employee for the previous calendar year (Form D).", "Karnataka", "Karnataka LWF");
      }
      if (has("lwf", laws) && klBoard) {
        add(yy, 6, 14, "Labour Welfare Fund: first half-year", "Pay ₹45 employee + ₹45 employer per employee for January to June to the Kerala Labour Welfare Fund Board. 9% a year interest if late.", "Kerala · factories and plantations", "Kerala LWF");
        add(yy, 0, 14, "Labour Welfare Fund: second half-year", "Pay ₹45 employee + ₹45 employer per employee for July to December to the Kerala Labour Welfare Fund Board. 9% a year interest if late.", "Kerala · factories and plantations", "Kerala LWF");
      }
      if (has("bonus", laws)) add(yy, 10, 30, "Statutory bonus", "Pay statutory bonus within 8 months of the financial year close.", "Establishments covered by bonus law", "Bonus");
      if (has("posh", laws)) add(yy, 0, 31, "POSH annual report", "File the Internal Committee's annual report with the District Officer. Some districts set a different date.", "Employers with 10+ staff", "POSH");
    }
    return out.sort(function (a, b) { return a.date - b.date; });
  }

  var api = { build: build, deadlines: deadlines, pending: pending, schedule: schedule, STATES: STATES, byCode: BY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HRTCalendarDoc = api;
})(this);
