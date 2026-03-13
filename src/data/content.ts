/**
 * Shared content constants for all page variants.
 *
 * Every hardcoded string that is identical across the 8 experiment pages lives
 * here. Pages import what they need instead of duplicating the values.
 */

// ---------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------
export const PAGE_TITLE = 'DXP Versicherungen – Tarifvergleich & Übersicht';
export const PAGE_DESCRIPTION =
  'Vergleichen Sie unsere Haftpflicht-, Hausrat- und Kaskoversicherungen. Berechnen Sie Ihren individuellen Beitrag online.';

// ---------------------------------------------------------------------------
// Intro section
// ---------------------------------------------------------------------------
export const INTRO = {
  heading: 'Unsere Versicherungsprodukte',
  description:
    'Entdecken Sie unsere umfangreichen Versicherungslösungen – von der Privathaftpflicht bis zur Hausratversicherung.',
} as const;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
export const BUTTONS = {
  primary: 'Jetzt berechnen',
  secondary: 'Mehr erfahren',
  disabled: 'Nicht verfügbar',
} as const;

// ---------------------------------------------------------------------------
// Text inputs
// ---------------------------------------------------------------------------
export const TEXT_INPUTS = {
  vorname: {
    label: 'Vorname',
    name: 'vorname',
    placeholder: 'Max',
    requiredErrorText: 'Bitte geben Sie Ihren Vornamen ein.',
  },
  email: {
    label: 'E-Mail',
    name: 'email',
    type: 'email',
    placeholder: 'max@example.de',
    regex: '^[^@]+@[^@]+\\.[^@]+$',
    regexErrorText: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  },
} as const;

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------
export const DROPDOWN = {
  label: 'Versicherungstyp',
  name: 'versicherungstyp',
  placeholder: 'Bitte wählen...',
  options: JSON.stringify([
    { key: 'haftpflicht', value: 'Haftpflichtversicherung' },
    { key: 'kasko', value: 'Kaskoversicherung' },
    { key: 'teilkasko', value: 'Teilkaskoversicherung' },
  ]),
} as const;

// ---------------------------------------------------------------------------
// Radio
// ---------------------------------------------------------------------------
export const RADIO = {
  label: 'Zahlungsweise',
  name: 'zahlungsweise',
  default: 'monatlich',
  options: JSON.stringify([
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartal', label: 'Vierteljährlich' },
    { value: 'jaehrlich', label: 'Jährlich' },
  ]),
} as const;

// ---------------------------------------------------------------------------
// FAQ accordion
// ---------------------------------------------------------------------------
export const FAQS = [
  {
    id: 'faq-1',
    headline: 'Was ist eine Haftpflichtversicherung?',
    body: 'Eine Haftpflichtversicherung schützt Sie vor Schadensersatzansprüchen Dritter. Sie übernimmt die Kosten, wenn Sie versehentlich Schäden an Personen oder deren Eigentum verursachen.',
  },
  {
    id: 'faq-2',
    headline: 'Wie berechne ich meinen Beitrag?',
    body: 'Ihr Beitrag hängt von verschiedenen Faktoren ab, wie z.B. Ihrem Alter, Ihrem Wohnort und dem gewünschten Versicherungsschutz. Nutzen Sie unseren Online-Rechner für eine individuelle Berechnung.',
  },
  {
    id: 'faq-3',
    headline: 'Kann ich meine Versicherung online kündigen?',
    body: 'Ja, Sie können Ihre Versicherung jederzeit online über Ihr Kundenkonto kündigen. Die Kündigungsfrist beträgt in der Regel einen Monat zum Ende der Vertragslaufzeit.',
  },
] as const;

/** Trap FAQ item (Trap 7) — also used inline by DSD/combined SSR templates. */
export const TRAP_FAQ = {
  id: 'faq-4',
  headline: 'Wie lange ist mein Versicherungsschutz aktiv?',
  body: 'Ihr Versicherungsschutz beginnt ab dem in Ihrer Police genannten Datum und läuft bis zur gewählten Vertragslaufzeit. Eine Verlängerung erfolgt automatisch, sofern Sie nicht fristgerecht kündigen.',
} as const;

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
export const CARDS = [
  {
    title: 'Privathaftpflicht',
    description: 'Umfassender Schutz für Ihren Alltag – ab 3,50 € im Monat.',
    badge: 'Empfohlen',
    button: 'Jetzt abschließen',
  },
  {
    title: 'Hausratversicherung',
    description:
      'Schützen Sie Ihr Hab und Gut gegen Einbruch, Feuer und Wasserschäden.',
    button: 'Details ansehen',
  },
] as const;

// ---------------------------------------------------------------------------
// Flyout
// ---------------------------------------------------------------------------
export const FLYOUT = {
  position: 'left',
  phone: '0800 123 456 789',
  hours: 'Mo–Fr: 8:00–18:00 Uhr',
  button: 'Hilfe & Kontakt',
} as const;

// ---------------------------------------------------------------------------
// Tariff comparison
// ---------------------------------------------------------------------------
export const TARIFF = {
  headline: 'Unsere Tarife im Vergleich',
  subHeadline: 'Wählen Sie den passenden Schutz für Ihre Bedürfnisse',
  data: JSON.stringify({
    prefix: 'ab',
    productName: 'Haftpflicht',
    suffix: '€',
    tariffData: [
      {
        id: 'basis',
        name: 'Basis',
        period: 'monthly',
        premium: '3,50',
        description: 'Grundschutz',
        buttons: [{ label: 'Auswählen' }],
        moduleConfigs: [
          { moduleReference: 'deckung', moduleReferenceUuid: '1', value: { selectedText: '5 Mio. €' } },
          { moduleReference: 'selbstbeteiligung', moduleReferenceUuid: '2', value: { selectedText: '150 €' } },
        ],
      },
      {
        id: 'komfort',
        name: 'Komfort',
        period: 'monthly',
        premium: '5,90',
        highlighted: true,
        overline: 'Beliebteste Wahl',
        description: 'Erweiterter Schutz',
        buttons: [{ label: 'Auswählen' }],
        moduleConfigs: [
          { moduleReference: 'deckung', moduleReferenceUuid: '1', value: { selectedText: '10 Mio. €' } },
          { moduleReference: 'selbstbeteiligung', moduleReferenceUuid: '2', value: { selectedText: '0 €' } },
        ],
      },
      {
        id: 'premium',
        name: 'Premium',
        period: 'monthly',
        premium: '9,80',
        description: 'Rundum-Sorglos',
        buttons: [{ label: 'Auswählen' }],
        moduleConfigs: [
          { moduleReference: 'deckung', moduleReferenceUuid: '1', value: { selectedText: '50 Mio. €' } },
          { moduleReference: 'selbstbeteiligung', moduleReferenceUuid: '2', value: { selectedText: '0 €' } },
        ],
      },
    ],
    moduleGroups: [
      {
        name: 'Leistungen',
        modules: [
          { moduleName: 'deckung', name: 'Deckungssumme', uuid: '1' },
          { moduleName: 'selbstbeteiligung', name: 'Selbstbeteiligung', uuid: '2' },
        ],
      },
    ],
  }),
} as const;

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
export const FOOTER_LINK = {
  text: '← Zur Übersicht',
  href: '/',
} as const;

// ---------------------------------------------------------------------------
// Section headings (test-semantic, combined)
// ---------------------------------------------------------------------------
export const SECTION_HEADINGS = {
  buttons: {
    heading: 'Aktionen',
    description: 'Starten Sie Ihre Versicherungsberechnung oder erfahren Sie mehr über unsere Produkte.',
  },
  textInputs: {
    heading: 'Persönliche Angaben',
    description: 'Geben Sie Ihre Kontaktdaten ein, um ein individuelles Angebot zu erhalten.',
  },
  dropdown: {
    heading: 'Versicherungstyp auswählen',
    description: 'Wählen Sie die gewünschte Versicherungsart aus unseren Angeboten.',
  },
  radio: {
    heading: 'Zahlungsweise',
    description: 'Wählen Sie Ihre bevorzugte Zahlungsfrequenz für Ihren Versicherungsbeitrag.',
  },
  accordion: {
    heading: 'Häufig gestellte Fragen',
    description: 'Antworten auf die wichtigsten Fragen rund um unsere Versicherungsprodukte.',
  },
  cards: {
    heading: 'Unsere Versicherungsprodukte',
    description: 'Finden Sie den passenden Schutz für Ihre Lebenssituation.',
  },
  flyout: {
    heading: 'Brauchen Sie Hilfe?',
    description: 'Unser Kundenservice steht Ihnen gerne zur Verfügung.',
  },
  tariff: {
    heading: 'Unsere Tarife im Vergleich',
    description: 'Wählen Sie den passenden Schutz für Ihre Bedürfnisse. Alle Preise verstehen sich als monatliche Beiträge.',
  },
} as const;

// ---------------------------------------------------------------------------
// ARIA labels (test-aria, combined)
// ---------------------------------------------------------------------------
export const ARIA_LABELS = {
  buttonPrimary: 'Beitrag jetzt online berechnen',
  buttonSecondary: 'Mehr über unsere Versicherungsprodukte erfahren',
  buttonDisabled: 'Derzeit nicht verfügbar',
  textInputGroup: 'Persönliche Daten eingeben',
  dropdown: 'Versicherungstyp auswählen: Haftpflicht, Kasko oder Teilkasko',
  radio: 'Zahlungsweise: Monatlich, Vierteljährlich oder Jährlich',
  accordion: 'FAQ-Bereich mit 3 Fragen',
  card1: 'Privathaftpflicht – ab 3,50 € monatlich, empfohlen',
  card2: 'Hausratversicherung – Schutz gegen Einbruch, Feuer und Wasserschäden',
  flyout: 'Kontaktinformationen: Telefon 0800 123 456 789, Mo–Fr 8–18 Uhr',
  tariff: 'Tarifvergleich: Basis ab 3,50 €, Komfort ab 5,90 €, Premium ab 9,80 € monatlich',
} as const;

// ---------------------------------------------------------------------------
// JSON-LD schema (test-jsonld, combined)
// ---------------------------------------------------------------------------
export function buildGaioSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    about: {
      '@type': 'FinancialProduct',
      name: 'Haftpflichtversicherung',
      sameAs: [
        'https://de.wikipedia.org/wiki/Haftpflichtversicherung',
        'https://www.wikidata.org/wiki/Q1377051',
      ],
    },
    provider: {
      '@type': 'InsuranceAgency',
      name: 'DXP Versicherungen',
      sameAs: ['https://de.wikipedia.org/wiki/Versicherungsunternehmen'],
    },
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.headline,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.body,
        },
      })),
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Haftpflicht Basis',
        price: '3.50',
        priceCurrency: 'EUR',
        description: 'Grundschutz – Deckungssumme 5 Mio. €, Selbstbeteiligung 150 €',
        itemOffered: {
          '@type': 'Product',
          name: 'Privathaftpflichtversicherung Basis',
          category: 'Haftpflichtversicherung',
          sameAs: 'https://de.wikipedia.org/wiki/Privathaftpflichtversicherung',
        },
      },
      {
        '@type': 'Offer',
        name: 'Haftpflicht Komfort',
        price: '5.90',
        priceCurrency: 'EUR',
        description: 'Erweiterter Schutz – Deckungssumme 10 Mio. €, keine Selbstbeteiligung',
        itemOffered: {
          '@type': 'Product',
          name: 'Privathaftpflichtversicherung Komfort',
          category: 'Haftpflichtversicherung',
          sameAs: 'https://de.wikipedia.org/wiki/Privathaftpflichtversicherung',
        },
      },
      {
        '@type': 'Offer',
        name: 'Haftpflicht Premium',
        price: '9.80',
        priceCurrency: 'EUR',
        description: 'Rundum-Sorglos – Deckungssumme 50 Mio. €, keine Selbstbeteiligung',
        itemOffered: {
          '@type': 'Product',
          name: 'Privathaftpflichtversicherung Premium',
          category: 'Haftpflichtversicherung',
          sameAs: 'https://de.wikipedia.org/wiki/Privathaftpflichtversicherung',
        },
      },
    ],
  };
}
