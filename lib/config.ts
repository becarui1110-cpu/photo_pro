import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Comprendre mes droits",
    prompt:
      "Explique-moi clairement quels sont mes droits en tant que salarié dans le cadre du droit du travail.",
    icon: "circle-question", // ✅ icône connue et typée
  },
  {
    label: "Licenciement / fin de contrat",
    prompt:
      "Je viens d’apprendre mon licenciement. Pose-moi les bonnes questions pour analyser ma situation et m’expliquer les étapes clés.",
    // icon retiré pour éviter l’erreur de type
  },
  {
    label: "Contrat & période d’essai",
    prompt:
      "Aide-moi à comprendre les clauses importantes de mon contrat de travail et les règles sur la période d’essai.",
    // icon retiré
  },
  {
    label: "Heures sup & salaire",
    prompt:
      "Explique-moi comment sont gérées les heures supplémentaires, le temps de travail et la rémunération dans le droit du travail.",
    // icon retiré
  },
];

export const PLACEHOLDER_INPUT =
  "Posez votre question sur votre situation de travail…";

export const GREETING =
  "Bonjour, je suis votre conseiller IA en droit du travail. Décrivez votre situation (contrat, licenciement, heures sup, harcèlement, etc.) et je vous aiderai à y voir plus clair.";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
      level: 1,
    },
  },
  radius: "round",
});
