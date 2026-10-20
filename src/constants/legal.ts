// Textes juridiques de l'appli. ⚠ BROUILLONS : à faire relire et valider par un juriste
// avant la mise en production (identité de l'éditeur, hébergeur, durées de conservation…).

export type LegalDocId = "terms" | "privacy" | "rules";

export type LegalSection = { title: string; body: string };
export type LegalDoc = { id: LegalDocId; title: string; sections: LegalSection[] };

export const LEGAL_DRAFT_NOTICE =
  "Version provisoire : ce texte sera finalisé avant l'ouverture publique de l'application.";

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    id: "terms",
    title: "Conditions générales d'utilisation",
    sections: [
      {
        title: "1. Objet",
        body: "Project Arena permet de s'inscrire à des tournois e-sport en ligne, de suivre leurs résultats et de gérer son profil de joueur. L'utiliser implique d'accepter les présentes conditions.",
      },
      {
        title: "2. Compte",
        body: "Il faut avoir au moins 18 ans. Les informations fournies doivent être exactes. Le compte est personnel : vous êtes responsable de la confidentialité de votre mot de passe et de ce qui est fait avec votre compte.",
      },
      {
        title: "3. Tournois gratuits",
        body: "Les tournois proposés sont gratuits : aucun paiement n'est demandé pour participer et aucune dotation en argent n'est distribuée.",
      },
      {
        title: "4. Comportement",
        body: "Tout comportement frauduleux (triche, faux résultats, comptes multiples, usurpation d'identité) ou injurieux est interdit. Les organisateurs peuvent donner un avertissement, suspendre ou bannir un compte, ou disqualifier un joueur d'un tournoi.",
      },
      {
        title: "5. Contenus",
        body: "Les photos et textes de profil que vous publiez doivent respecter la loi et les droits des tiers. Les actualités affichées proviennent de médias tiers : chaque carte renvoie vers l'article d'origine.",
      },
      {
        title: "6. Suppression du compte",
        body: "Vous pouvez supprimer votre compte à tout moment depuis votre profil. Vos données personnelles sont alors effacées ou anonymisées ; les matchs en cours sont perdus par forfait.",
      },
      {
        title: "7. Responsabilité",
        body: "L'application est fournie en l'état. Nous ne garantissons pas une disponibilité continue et nous ne sommes pas responsables des interruptions des jeux ou services tiers utilisés pour disputer les matchs.",
      },
      {
        title: "8. Modifications",
        body: "Ces conditions peuvent évoluer. En cas de changement important, vous en serez informé dans l'application.",
      },
    ],
  },
  privacy: {
    id: "privacy",
    title: "Politique de confidentialité",
    sections: [
      {
        title: "1. Données collectées",
        body: "Adresse e-mail, pseudo, date de naissance (pour vérifier la majorité), photo et bio facultatives, identifiants de jeu que vous ajoutez, résultats et historique de vos matchs, jeton de notification de votre appareil.",
      },
      {
        title: "2. Finalités",
        body: "Gérer votre compte, organiser les tournois, afficher les classements et statistiques, vous envoyer les notifications liées à vos matchs, prévenir la fraude et assurer la modération.",
      },
      {
        title: "3. Ce qui est public",
        body: "Votre pseudo, votre photo, votre bio, vos statistiques et vos résultats sont visibles des autres joueurs. Votre e-mail et votre date de naissance ne le sont jamais.",
      },
      {
        title: "4. Hébergement et sous-traitants",
        body: "Les données sont hébergées chez Supabase. Les notifications passent par le service de notifications d'Expo.",
      },
      {
        title: "5. Vos droits",
        body: "Vous pouvez consulter et modifier vos informations dans votre profil, et supprimer votre compte à tout moment : l'e-mail, le mot de passe, la date de naissance et les identifiants de jeu sont alors effacés, le pseudo est remplacé par un identifiant anonyme. Pour toute autre demande (accès, rectification, opposition), contactez l'éditeur de l'application.",
      },
      {
        title: "6. Conservation",
        body: "Les données d'un compte actif sont conservées tant que le compte existe. Après suppression, seuls des résultats de matchs anonymisés sont conservés pour préserver l'historique des tournois.",
      },
    ],
  },
  rules: {
    id: "rules",
    title: "Règlement des tournois",
    sections: [
      {
        title: "1. Inscription",
        body: "L'inscription est possible jusqu'à la date de clôture indiquée sur la page du tournoi, dans la limite des places disponibles. Un tournoi peut démarrer dès 2 inscrits ; si le nombre d'inscrits n'est pas une puissance de 2, les premiers inscrits sont exemptés du premier tour.",
      },
      {
        title: "2. Déroulement",
        body: "Les tournois se jouent en élimination directe. Les deux joueurs d'un match conviennent d'un horaire avant la date limite, jouent la partie, puis l'un d'eux saisit le score.",
      },
      {
        title: "3. Résultat",
        body: "L'adversaire confirme le score ou ouvre un litige. Un score nul est impossible. Sans confirmation ni litige, les organisateurs peuvent trancher.",
      },
      {
        title: "4. Preuves",
        body: "En cas de litige, chaque joueur peut joindre des captures d'écran. Les organisateurs décident au vu des éléments fournis ; leur décision est définitive.",
      },
      {
        title: "5. Forfait",
        body: "Un joueur absent ou injoignable peut être déclaré forfait par les organisateurs : son adversaire est qualifié.",
      },
      {
        title: "6. Fair-play et sanctions",
        body: "Triche, faux résultats, insultes ou comptes multiples entraînent, selon la gravité : avertissement, disqualification, suspension ou bannissement.",
      },
      {
        title: "7. Annulation",
        body: "Les organisateurs peuvent annuler un tournoi ; les matchs en cours sont alors annulés et les inscrits prévenus.",
      },
    ],
  },
};

export function isLegalDocId(value: unknown): value is LegalDocId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LEGAL_DOCS, value);
}
