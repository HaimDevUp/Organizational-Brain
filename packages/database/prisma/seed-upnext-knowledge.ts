/**
 * Seeds Upnext WordPress knowledge documents with Obsidian-style [[wiki links]].
 * Run: pnpm db:seed:upnext
 * Updates existing docs when content changes (bumps version + re-index).
 */
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { buildMarkdownWithFrontmatter } from "@obos/shared";

const prisma = new PrismaClient();

/** Org slug in DB (UpNext org is slug `up`, name "UpNext"). Override: ORG_SLUG=upnext */
const ORG_SLUG = process.env.ORG_SLUG ?? "up";
const DEPT_SLUG = "engineering";

/** Shorthand titles for wiki links — must match document `title` fields exactly */
const T = {
  workflow: "תהליך פיתוח WordPress — מסביבה מקומית עד Production",
  analysis: "ניתוח משימת לקוח לפני תחילת פיתוח",
  checklist: "צ'קליסט העלאה ל-Production",
  scss: "נהלי SCSS ו-JavaScript ב-Upnext",
  elementor: "עבודה עם Elementor — Templates, ACF ו-Custom Code",
  onboarding: "אונבורדינג מפתח חדש — Upnext",
  approval: "מדיניות אישור ופרסום ידע ב-Upnext",
} as const;

type DocSeed = {
  title: string;
  slug: string;
  docType: "policy" | "runbook" | "faq" | "general";
  tags: string[];
  body: string;
};

const DOCUMENTS: DocSeed[] = [
  {
    title: T.workflow,
    slug: "wordpress-production",
    docType: "runbook",
    tags: ["wordpress", "upnext", "workflow", "production"],
    body: `# תהליך פיתוח WordPress — מסביבה מקומית עד Production

## עקרון על

ב-Upnext **כל** פרויקט WordPress מתחיל בסביבת פיתוח. אין העלאה ישירה ל-production.
לפני כל משימה — ראה [[${T.analysis}]].

## שלבי העבודה

1. **הקמת סביבה מקומית** — WordPress, מסד נתונים, תבנית או Elementor, תוספים נדרשים.
2. **בחירת גישת פיתוח** — Custom Theme **או** [[${T.elementor}]], לפי אפיון הפרויקט.
3. **סטיילים** — כל ה-CSS דרך **SCSS** לפי [[${T.scss}]] (קומפילציה לפני deploy).
4. **JavaScript** — רק בקבצים ייעודיים לפי [[${T.scss}]]; **אסור** JS מוטמע בתבניות/HTML.
5. **בדיקות בסביבת פיתוח** — כל שינוי נבדק locally לפני הצגה ללקוח.
6. **אישור לקוח / מנהל פרויקט** — רק אחרי אישור מפורש (ראה [[${T.approval}]]).
7. **העלאה ל-production** — לפי [[${T.checklist}]] בלבד.

## קשור גם ל

- [[${T.onboarding}]] — מסלול למפתח חדש
- [[${T.approval}]] — מתי מפרסמים ידע חדש

## מטרות

- אחידות קוד בין מפתחים ופרויקטים
- תחזוקה ארוכת טווח
- מניעת regressions ב-production

## תיעוד ידע

כל תהליך חדש או החלטה משמעותית מתועדים ב-Organizational Brain ועוברים **אישור** לפי [[${T.approval}]].
אין להסתמך על זיכרון אישי.`,
  },
  {
    title: T.analysis,
    slug: "client-task-analysis",
    docType: "runbook",
    tags: ["wordpress", "upnext", "planning", "client"],
    body: `# ניתוח משימת לקוח לפני תחילת פיתוח

כל משימה חדשה מלקוח **נפתחת ומנותחת** לפני כתיבת קוד — זה השלב הראשון ב-[[${T.workflow}]].

## שאלות חובה

| שאלה | מטרה |
|------|------|
| מה הלקוח מבקש בפועל? | להפריד בקשה מפתרון |
| האם יש השפעה על חלקים אחרים באתר? | תכנון regression |
| האם נדרשים שינויים במסד נתונים? | migrations, גיבוי, staging |
| האם נדרשות הרשאות מיוחדות? | roles, API, תוספים |
| Elementor או קוד תבנית? | ראה [[${T.elementor}]] |

## פלט מצופה

- הערכת זמן קצרה
- רשימת סיכונים
- החלטה: PR נפרד / משימת משנה / דחייה

## לפני העלאה לאוויר

מתבצעת **בדיקה ידנית מלאה** לפי [[${T.checklist}]].
שינויי SCSS/JS חייבים לעמוד ב-[[${T.scss}]].`,
  },
  {
    title: T.checklist,
    slug: "production-checklist",
    docType: "runbook",
    tags: ["wordpress", "upnext", "production", "qa", "checklist"],
    body: `# צ'קליסט העלאה ל-Production

העלאת קוד ל-production מותרת **רק** אחרי שכל הסעיפים עברו.
זה השלב האחרון ב-[[${T.workflow}]] — לא מדלגים על [[${T.analysis}]].

## בדיקות חובה

- [ ] **תקינות כללית** — עמודים מרכזיים, אין 500/404 חדשים
- [ ] **טפסים** — שליחה, ולידציה, מיילים/אינטגרציות
- [ ] **סליקה / תשלום** — flow מלא ב-staging (אם רלוונטי)
- [ ] **מובייל** — רספונסיביות, תפריט, מגע
- [ ] **קונסול דפדפן** — אין שגיאות אדומות קריטיות (ראה [[${T.scss}]])
- [ ] **SCSS** — קומפילציה תקינה לפי [[${T.scss}]], אין קבצים שבורים
- [ ] **Elementor** — templates עקביים לפי [[${T.elementor}]]
- [ ] **נכסים** — תמונות, פונטים, ביצועים סבירים
- [ ] **SEO בסיסי** — titles; staging לא מאונדקס ל-production

## כלל

רק לאחר שכל הבדיקות עברו — מעלים את הקוד ומעדכנים את הלקוח.
מפתח חדש? [[${T.onboarding}]] מפרט מי מאשר העלאה ראשונה.`,
  },
  {
    title: T.scss,
    slug: "scss-javascript-upnext",
    docType: "policy",
    tags: ["wordpress", "upnext", "scss", "javascript", "frontend"],
    body: `# נהלי SCSS ו-JavaScript ב-Upnext

חלק מרכזי ב-[[${T.workflow}]]. נבדק ב-[[${T.checklist}]] לפני כל deploy.

## SCSS

- שימוש ב-**משתנים** (צבעים, מרווחים, breakpoints)
- **חלוקה לקבצים** לפי רכיבים (\`_header.scss\`, \`_forms.scss\`)
- **הימנעות מ-CSS כפול** — partials ומבנה אחיד
- מבנה **קריא ותחזוקתי** (BEM או convention צוותי קבוע)
- בפרויקטי [[${T.elementor}]] — CSS מרוכז בקבצי SCSS, לא ב-Custom CSS פר עמוד

## JavaScript

- כתיבה ב-**קבצים ייעודיים** בלבד (\`assets/js/...\`)
- **אסור** להטמיע JS בתוך HTML או תבניות PHP
- טעינה דרך \`wp_enqueue_script\` עם dependencies
- בדיקת קונסול אחרי כל שינוי משמעותי

## למידה

מפתח חדש לומד את הנהלים ב-[[${T.onboarding}]] לפני PR ראשון.`,
  },
  {
    title: T.elementor,
    slug: "elementor-templates-acf-custom-code",
    docType: "runbook",
    tags: ["wordpress", "upnext", "elementor", "acf"],
    body: `# עבודה עם Elementor — Templates, ACF ו-Custom Code

## מתי בוחרים Elementor?

בשלב [[${T.analysis}]] מחליטים: Elementor או Custom Theme — חלק מ-[[${T.workflow}]].

## להעדיף

- **Templates** — Header, Footer, Single, Archive (לא לשכפל עיצוב בכל עמוד)
- **ACF** — תוכן דינמי בשדות מובנים, לא ב-widgets מקורבים
- **Custom Code** — רק כשאין פתרון מובנה ב-Elementor
- **סטיילים** — [[${T.scss}]] לכל CSS משמעותי

## להימנע

- כפילות בין תבניות דומות
- CSS מפוזר ב-Custom CSS של כל עמוד בנפרד
- לוגיקה עסקית כבדה בתוך widget HTML

## קישור לתהליך

שינויי Elementor עוברים אותו מחזור: פיתוח מקומי → בדיקות → אישור → [[${T.checklist}]].
משימות מורכבות מתועדות ב-[[${T.approval}]].`,
  },
  {
    title: T.onboarding,
    slug: "developer-onboarding",
    docType: "general",
    tags: ["wordpress", "upnext", "onboarding", "training"],
    body: `# אונבורדינג מפתח חדש — Upnext

מפתח חדש נדרש להגיע ל**עצמאות מלאה** בפרויקטים WordPress.

## מסלול למידה (בסדר מומלץ)

1. [[${T.workflow}]] — המחזור המלא מקומי עד production
2. [[${T.analysis}]] — איך פותחים משימת לקוח
3. [[${T.elementor}]] — Templates, ACF, Custom Code
4. [[${T.scss}]] — מבנה SCSS ו-JavaScript
5. [[${T.checklist}]] — מה בודקים לפני העלאה
6. [[${T.approval}]] — איך מפרסמים ידע חדש ב-Brain

## משך משוער

2–4 שבועות עם חונך, לפי רקע קודם.

## מנטור

מפתח בכיר מאשר משימות ראשונות ב-production (לפי [[${T.checklist}]]) עד לאישור עצמאות.
כל תיעוד חדש שהמנטור יוצר — לפי [[${T.approval}]].`,
  },
  {
    title: T.approval,
    slug: "knowledge-approval",
    docType: "policy",
    tags: ["wordpress", "upnext", "governance", "knowledge"],
    body: `# מדיניות אישור ופרסום ידע ב-Upnext

## עקרון

Organizational Brain הוא **מקור האמת** לתהליכי הצוות.
ידע לא נכנס למערכת בלי אישור — כמו שקוד לא עולה ל-production בלי [[${T.checklist}]].

## מתי מתעדים?

- תהליך חדש או שינוי ב-[[${T.workflow}]]
- החלטה על Elementor vs Theme ([[${T.elementor}]])
- עדכון נהלי [[${T.scss}]]
- לקחים ממשימות לקוח ([[${T.analysis}]])

## תהליך פרסום

1. טיוטה במסמך Markdown עם קישורי [[wiki]] למסמכים קשורים
2. Pull Request / אישור מנהל ידע
3. פרסום (סטטוס published) + אינדוקס ל-Brain
4. מפתחים חדשים רואים את זה ב-[[${T.onboarding}]]

## קישוריות

מסמכים קשורים מקושרים ב-[[שם מסמך]] — כך ה-Brain מבין תלויות ומסלולי למידה.`,
  },
];

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: ORG_SLUG, deletedAt: null },
  });
  if (!org) {
    throw new Error(`Organization "${ORG_SLUG}" not found. Create it in the UI first.`);
  }

  let dept = await prisma.department.findFirst({
    where: { organizationId: org.id, slug: DEPT_SLUG, deletedAt: null },
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        organizationId: org.id,
        name: "Engineering",
        slug: DEPT_SLUG,
        path: `/departments/${DEPT_SLUG}`,
        description: "פיתוח WordPress ו-Frontend",
      },
    });
    console.log(`Created department: ${dept.slug}`);
  }

  const owner =
    (await prisma.user.findUnique({
      where: { email: process.env.DEV_AUTH_USER_EMAIL ?? "dev@obos.local" },
    })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!owner) {
    throw new Error("No user found. Sign in once or set DEV_AUTH_USER_EMAIL.");
  }

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: owner.id },
    },
    create: {
      organizationId: org.id,
      userId: owner.id,
      status: "active",
      joinedAt: new Date(),
    },
    update: { status: "active" },
  });

  const placeholderSha = "0".repeat(40);

  async function upsertDocument(spec: DocSeed) {
    const slug = spec.slug;
    const gitPath = `departments/${DEPT_SLUG}/${slug}.md`;
    const markdown = buildMarkdownWithFrontmatter(spec.body, {
      title: spec.title,
      tags: spec.tags,
      owner: owner.email,
    });
    const hash = contentHash(markdown);

    const existing = await prisma.knowledgeDocument.findFirst({
      where: {
        organizationId: org.id,
        deletedAt: null,
        OR: [{ slug }, { title: spec.title }],
      },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if (existing) {
      const last = existing.versions[0];
      if (last?.contentHash === hash) {
        console.log(`Unchanged: ${spec.title}`);
        return existing.id;
      }

      const version = await prisma.knowledgeVersion.create({
        data: {
          organizationId: org.id,
          documentId: existing.id,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          gitCommitSha: placeholderSha,
          contentHash: hash,
          contentPreview: markdown,
          wordCount: wordCount(markdown),
          createdById: owner.id,
          mergedAt: new Date(),
        },
      });

      await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: {
          currentVersionId: version.id,
          tags: spec.tags,
          slug,
          title: spec.title,
          gitPath,
        },
      });

      await prisma.indexingJob.create({
        data: {
          organizationId: org.id,
          documentId: existing.id,
          commitSha: placeholderSha,
          status: "pending",
        },
      });

      console.log(`Updated: ${spec.title} (v${version.versionNumber})`);
      return existing.id;
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: org.id,
        departmentId: dept.id,
        title: spec.title,
        slug,
        gitPath,
        docType: spec.docType,
        status: "published",
        ownerUserId: owner.id,
        tags: spec.tags,
      },
    });

    const version = await prisma.knowledgeVersion.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        versionNumber: 1,
        gitCommitSha: placeholderSha,
        contentHash: hash,
        contentPreview: markdown,
        wordCount: wordCount(markdown),
        createdById: owner.id,
        mergedAt: new Date(),
      },
    });

    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { currentVersionId: version.id },
    });

    await prisma.indexingJob.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        commitSha: placeholderSha,
        status: "pending",
      },
    });

    console.log(`Created: ${spec.title} → /${ORG_SLUG}/knowledge/${doc.id}`);
    return doc.id;
  }

  for (const spec of DOCUMENTS) {
    await upsertDocument(spec);
  }

  // Legacy: queue indexing for any published doc missing a job
  const published = await prisma.knowledgeDocument.findMany({
    where: { organizationId: org.id, status: "published", deletedAt: null },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  for (const doc of published) {
    const sha = doc.versions[0]?.gitCommitSha ?? placeholderSha;
    const existing = await prisma.indexingJob.findFirst({
      where: {
        documentId: doc.id,
        commitSha: sha,
        status: { in: ["pending", "processing", "completed"] },
      },
    });
    if (existing) continue;
    await prisma.indexingJob.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        commitSha: sha,
        status: "pending",
      },
    });
    console.log(`Queued indexing: ${doc.title}`);
  }

  console.log(`\nDone. Open http://localhost:3000/${ORG_SLUG}/knowledge`);
  console.log(`Graph: http://localhost:3000/${ORG_SLUG}/graph`);
  console.log("Run `pnpm indexer:dev` for Qdrant embeddings.");
  console.log("Run `pnpm db:reindex:graph` to build wiki-link edges.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
