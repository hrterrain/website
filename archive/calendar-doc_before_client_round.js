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
            para([run(period + "  ·  " + (o.states.length ? o.states.join(" & ") : "All states"), { size: 20, color: MUTED })])
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
      para([run("General reference, not legal advice. Due dates move when they fall on a holiday or when authorities issue extensions, and applicability depends on your state, establishment type, headcount and wage structure. Kerala Professional Tax and POSH report dates can vary by local body or district: confirm yours.", { size: 17, color: MUTED })], { spacing: { after: 240 } }),
      para([run("Want these filings handled for you?", { bold: true, size: 22, color: NAVY })], { keepNext: true, spacing: { after: 60 } }),
      para([run("HR Terrain runs HR operations, payroll and statutory compliance for businesses in Kerala, Karnataka and across India.", { size: 18, color: INK })], { keepNext: true, spacing: { after: 60 } }),
      para([
        run("abhiraj@hrterrain.com", { bold: true, size: 18, color: NAVY }),
        run("   ·   WhatsApp +91 99950 94978   ·   hrterrain.com", { size: 18, color: INK })
      ])
    ];

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

  /* the next 12 months of deadlines for the chosen states and obligations */
  function deadlines(states, laws, now) {
    var has = function (v, a) { return a.indexOf(v) > -1; }, KL = has("KL", states), KA = has("KA", states), out = [];
    now = now || new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), until = new Date(today);
    until.setFullYear(until.getFullYear() + 1);
    function prev(m) { return ML[(m + 11) % 12]; }
    function add(y, m, d, title, desc, applies) {
      var dt = new Date(y, m, d);
      if (dt >= today && dt < until) out.push({ date: dt, title: title, desc: desc, applies: applies });
    }
    for (var i = 0; i < 13; i++) {
      var y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12), m = (today.getMonth() + i) % 12;
      if (has("tds", laws)) add(y, m, m === 3 ? 30 : 7, "TDS deposit on salaries", "Deposit tax deducted from " + prev(m) + " salaries." + (m === 3 ? " March deductions are due by 30 April." : ""), "Employers deducting TDS");
      if (has("epf", laws)) add(y, m, 15, "EPF: ECR filing and payment", "File the ECR and pay employer and employee PF for " + prev(m) + " wages.", "Establishments covered by EPF");
      if (has("esi", laws)) add(y, m, 15, "ESI contribution", "Pay employer and employee ESI share for " + prev(m) + " wages.", "Establishments covered by ESI");
      if (has("pt", laws) && KA) add(y, m, 20, "Professional Tax", "Monthly PT return and payment for " + prev(m) + ".", "Karnataka");
    }
    for (var yy = today.getFullYear() - 1; yy <= today.getFullYear() + 1; yy++) {
      if (has("tds", laws)) {
        [[6, 31, "April to June"], [9, 31, "July to September"], [0, 31, "October to December"], [4, 31, "January to March"]].forEach(function (q) {
          add(yy, q[0], q[1], "Quarterly TDS return", "File Form 24Q for " + q[2] + ".", "Employers deducting TDS");
        });
        add(yy, 5, 15, "Form 16 to employees", "Issue annual TDS certificates for the previous financial year.", "Employers deducting TDS");
      }
      if (has("pt", laws) && KL) {
        add(yy, 7, 31, "Professional Tax: first half-year", "Pay PT to the local body for April to September. Confirm the date with your municipality or panchayat.", "Kerala");
        add(yy, 1, new Date(yy, 2, 0).getDate(), "Professional Tax: second half-year", "Pay PT to the local body for October to March. Confirm the date with your municipality or panchayat.", "Kerala");
      }
      if (has("lwf", laws) && KA) add(yy, 0, 15, "Labour Welfare Fund", "Annual LWF contribution for the previous calendar year.", "Karnataka");
      if (has("bonus", laws)) add(yy, 10, 30, "Statutory bonus", "Pay statutory bonus within 8 months of the financial year close.", "Establishments covered by bonus law");
      if (has("posh", laws)) add(yy, 0, 31, "POSH annual report", "File the Internal Committee's annual report with the District Officer. Some districts set a different date.", "Employers with 10+ staff");
    }
    return out.sort(function (a, b) { return a.date - b.date; });
  }

  var api = { build: build, deadlines: deadlines };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HRTCalendarDoc = api;
})(this);
