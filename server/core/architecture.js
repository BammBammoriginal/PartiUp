'use strict';

/**
 * PartiUp P0.1 architecture catalogue.
 * This file is intentionally dependency-free: it defines stable product boundaries
 * before the existing v0.9.3 runtime is physically split into routers/services.
 */
const CORE_CAPABILITIES = Object.freeze([
  'identity','spaces','relations','places','topics','memberships','permissions',
  'trust','moderation','feed','search','notifications'
]);

const PRODUCT_MODULES = Object.freeze({
  participation: { coreProduct: true, description: 'Gemeinsame Beteiligungs-Engine für alle Space-Typen: Phasen, Vorschläge, Meinungsbilder, Abstimmungen, Beratung und nachvollziehbare Ergebnisse' },
  events: { coreProduct: false, description: 'Veranstaltungen und Teilnahme' },
  projects: { coreProduct: false, description: 'Projekte und projektbezogene Zusammenarbeit' },
  discussion: { coreProduct: false, description: 'Beiträge, Kommentare und strukturierte Diskussion' },
  tasks: { coreProduct: false, description: 'Generische Aufgaben an Spaces/Objekten' },
  media: { coreProduct: false, description: 'Bilder, Videos und weitere Medienobjekte' }
});

const INTEROPERABILITY = Object.freeze({
  federation: {
    protocol: 'ActivityPub',
    status: 'media-foundation-ready',
    responsibilities: ['actors','objects','inbox','outbox','discovery','signatures','remote-object-safety','media-attachments','media-provenance']
  },
  connectors: {
    status: 'foundation-ready',
    purpose: 'Nicht-ActivityPub-Netze, Feeds und APIs provider-neutral anbinden',
    examples: ['rss-atom','atproto','tumblr','generic-api']
  },
  integrations: {
    status: 'foundation-ready',
    purpose: 'CivicTech-, Beteiligungs- und Demokratie-Systeme domain-spezifisch anbinden, ohne sie in den Core zu kopieren',
    examples: ['decidim','consul-democracy','wechange','democracy-data'],
    principles: ['read-only-first','provider-neutral-mapping','provenance-required','writeback-explicit-opt-in']
  }
});

function architectureSnapshot(){
  return {
    product: 'PartiUp',
    meaning: 'ParticipationUpwards',
    milestone: 'P0.15',
    core: CORE_CAPABILITIES,
    modules: PRODUCT_MODULES,
    interoperability: INTEROPERABILITY,
    principles: [
      'mobile-first-ux','participation-as-core-product','space-linking-as-core',
      'privacy-by-design','security-by-design','least-privilege','retrofit-required','verified-components','signed-releases','api-readiness','federation-first',
      'connector-readiness','integration-readiness','provider-neutral-normalization','extension-readiness','municipal-participation-readiness','accessible-by-design'
    ]
  };
}

module.exports={CORE_CAPABILITIES,PRODUCT_MODULES,INTEROPERABILITY,architectureSnapshot};
