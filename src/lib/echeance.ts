export type EcheanceState = {
  code: "clos" | "attente_depot" | "a_relancer" | "echeance_proche" | "en_cours";
  label: string;
  emoji: string;
  color: "success" | "warning" | "destructive" | "default" | "outline";
  jours?: number;
};

const DELAI_CONTRACTUEL = 30;

export function computeEcheance(f: {
  statut_part_assureur: string | null;
  date_depot: Date | string | null;
  part_assureur: number | null;
}): EcheanceState {
  const statut = f.statut_part_assureur ?? "";
  if (["Soldé", "Rejeté", "N/A"].includes(statut) || (f.part_assureur ?? 0) === 0) {
    return { code: "clos", label: "Clos / Non applicable", emoji: "✅", color: "outline" };
  }

  if (!f.date_depot) {
    return { code: "attente_depot", label: "En attente de dépôt", emoji: "⏳", color: "default" };
  }

  const depot = new Date(f.date_depot);
  const now = new Date();
  const joursEcoules = Math.floor((now.getTime() - depot.getTime()) / 86400_000);
  const joursRestants = DELAI_CONTRACTUEL - joursEcoules;

  if (joursRestants < 0) {
    return {
      code: "a_relancer",
      label: `À RELANCER (dépassé de ${Math.abs(joursRestants)}j)`,
      emoji: "🚨",
      color: "destructive",
      jours: Math.abs(joursRestants),
    };
  }
  if (joursRestants <= 5) {
    return {
      code: "echeance_proche",
      label: `Échéance proche (${joursRestants}j restants)`,
      emoji: "⚠️",
      color: "warning",
      jours: joursRestants,
    };
  }
  return {
    code: "en_cours",
    label: `En cours (${joursRestants}j restants)`,
    emoji: "🟢",
    color: "success",
    jours: joursRestants,
  };
}
