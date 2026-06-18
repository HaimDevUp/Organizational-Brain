# מהיר לי — מוח ארגוני

חברת שליחויות ישראלית, פעילה מאז 2019. מעל 320 שליחים, 4 מרכזי מיון, כ-180,000 משלוחים בחודש.

## תחומים

- [[mahir-li--about]] — חזון, ערכים, מבנה ארגוני
- [[mahir-li--operations]] — תפעול ולוגיסטיקה
- [[mahir-li--finance]] — כספים ותמחור
- [[mahir-li--hr]] — משאבי אנוש והכשרות
- [[mahir-li--suppliers]] — ספקים
- [[mahir-li--clients]] — לקוחות אסטרטגיים
- [[mahir-li--fleet]] — צי רכב
- [[mahir-li--technology]] — מערכות וטכנולוגיה
- [[mahir-li--customer-service]] — שירות לקוחות
- [[mahir-li--legal]] — רגולציה וביטוח

## אנשי מפתח

- [[mahir-li--people--ceo]] — דנה כהן, מנכ"לית
- [[mahir-li--people--ops-director]] — יוסי מזרחי, סמנכ"ל תפעול
- [[mahir-li--people--finance-manager]] — רונית לוי, מנהלת כספים
- [[mahir-li--people--hr-manager]] — עמית שחר, מנהל HR

# clients

- [[mahir-li--client--shufersal]]
- [[mahir-li--client--teva]]
- [[mahir-li--client--israel-post]]
- [[mahir-li--client--wolt-partners]]

# suppliers

- [[mahir-li--supplier--leasing-or-yar]]
- [[mahir-li--supplier--delek]]
- [[mahir-li--supplier--carton-tech]]
- [[mahir-li--supplier--harel-insurance]]
- [[mahir-li--supplier--logisticore]]

---

# ACTIONS

כשאני נותן הוראה — בצע אותה ועדכן את הקבצים הרלוונטיים.

## הוספת לקוח אסטרטגי חדש

כשאני אומר שיש **לקוח אסטרטגי חדש**:
1. צור קובץ `mahir-li--client--{slug}.md` (slug = שם באנגלית (אותיות latin), למשל `mega`, `fox-home`)
2. כתוב: שם הלקוח, איש קשר, הסכם, SLA, היקף חודשי משוער, הערות
3. הוסף קישור תחת `# clients` בקובץ זה (`mahir-li.md`)
4. הוסף קישור גם ב-[[mahir-li--clients]]

## הוספת ספק חדש

כשאני אומר שיש **ספק חדש**:
1. צור קובץ `mahir-li--supplier--{slug}.md`
2. כתוב: שם, תחום, איש קשר, תנאי תשלום, חוזה עד, הערות
3. הוסף קישור תחת `# suppliers` בקובץ זה
4. הוסף קישור ב-[[mahir-li--suppliers]]

## עדכון נוהל תפעולי (SOP)

כשאני אומר **נוהל חדש** או **עדכון SOP**:
1. צור/עדכן קובץ `mahir-li--sop--{slug}.md`
2. כתוב: מטרה, שלבים, אחראי, KPI, תאריך עדכון
3. קשר ל-[[mahir-li--operations]] ולתחום הרלוונטי

## הוספת עובד/ת מפתח/ה

כשאני אומר **איש מפתח חדש**:
1. צור `mahir-li--people--{slug}.md`
2. כתוב: שם, תפקיד, טלפון, אחריות, דיווח ל-
3. הוסף תחת `## אנשי מפתח` בקובץ זה

## רישום אירוע/תקלה תפעולית

כשאני מדווח על **אירוע תפעולי** (עיכוב, תקלה, שביתה):
1. צור `mahir-li--incident--{date}-{slug}.md`
2. כתוב: מה קרה, השפעה, פעולות, לקחים
3. קשר ל-[[mahir-li--operations]] וללקוח/ספק אם רלוונטי

## עדכון תעריף או SLA

כשאני מעדכן **תעריף** או **SLA**:
1. עדכן את הקובץ הרלוונטי (לקוח / [[mahir-li--finance--pricing]] / [[mahir-li--operations--sla]])
2. הוסף סעיף `## pricing history` או `## SLA history` עם תאריך
