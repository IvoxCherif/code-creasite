# Audit de sécurité — codecréa.com

Date : 28 novembre 2026 · Référentiels : OWASP Top 10:2025, OWASP ASVS 5.0 (niveau 2 visé), OWASP Cheat Sheets, loi sénégalaise n° 2008-12 (CDP).

## Résumé exécutif

1. codecréa.com est un **site vitrine statique** (HTML/CSS/JS servi par Caddy dans Docker sur un VPS) : pas de comptes, pas de base de données, pas de paiement, pas d'upload.
2. Les formulaires n'envoient **rien au serveur** : ils ouvrent WhatsApp ou la messagerie du visiteur. Le serveur ne stocke **aucune donnée personnelle**.
3. Bases saines : HTTPS + HSTS, TLS 1.2/1.3 uniquement, aucun fichier sensible exposé, aucun secret dans le code ni l'historique git, seuls les ports 22/80/443 ouverts.
4. Corrigé dans ce lot : en-têtes de sécurité complétés (CSP testée sans violation), une injection HTML dans le concept Dem Dikk, un formulaire de concept qui écrivait à la vraie entreprise, liens externes durcis.
5. Restent surtout des actions **hors code** : enregistrements DNS anti-usurpation d'e-mail (SPF/DMARC/CAA), vérification du serveur (SSH, pare-feu, fail2ban), mentions légales et politique de confidentialité.

**Score global : 7/10 avant ce lot → 8,5/10 après mise en ligne → 9,5/10 une fois les actions DNS, serveur et légales faites.**

## Cartographie (phase 1)

| Élément | Détail |
|---|---|
| Pages | `/`, `/services`, `/sites-web`, `/logiciels`, `/creation-visuelle`, `/automatisation`, `/realisations`, `/a-propos`, `/tarifs`, `/contact`, `/projets/…` (3 concepts), 404, `sitemap.xml`, `robots.txt` |
| Méthodes | GET/HEAD uniquement, sans authentification (les autres méthodes répondent désormais 405) |
| Formulaires | 5 formulaires de devis/contact → `wa.me/221770871548` ou `mailto:` côté navigateur |
| Tiers | Google Fonts (CSS + polices), carte Google Maps (concept Dem Dikk) |
| Hébergement | VPS 2.25.6.122, conteneur `codecrea-site` (Caddy, `read_only`, `cap_drop: ALL`, `no-new-privileges`, 256 Mo, 0,5 CPU) |
| Flux de données | Visiteur → navigateur → WhatsApp / messagerie du visiteur. Aucune donnée ne transite par le serveur. |

## Tableau des constats

| # | Gravité | OWASP 2025 | Où | Risque concret | Correctif | Statut |
|---|---|---|---|---|---|---|
| 1 | 🟠 Élevé | A02 Mauvaise configuration | `deploy/Caddyfile` | Pas de CSP : une injection de script éventuelle ne serait pas bloquée | CSP stricte (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`…), testée en mode bloquant sur les 20 pages : **0 violation**. Déployée d'abord en `Report-Only` | ✅ Corrigé (à mettre en ligne) |
| 2 | 🟡 Moyen | A02 | `deploy/Caddyfile` | `X-Frame-Options: SAMEORIGIN`, pas de `Permissions-Policy` ni `Cross-Origin-Opener-Policy` | `DENY`, `Permissions-Policy` (caméra, micro, géoloc., paiement, USB coupés), `COOP: same-origin` | ✅ Corrigé (à mettre en ligne) |
| 3 | 🟡 Moyen | A02 | `deploy/Caddyfile` | La page 404 était servie sans les en-têtes de sécurité | En-têtes regroupés dans un bloc commun, appliqué aussi à la 404 et à `www` | ✅ Corrigé (à mettre en ligne) |
| 4 | 🟡 Moyen | A06 Conception non sécurisée | `projets/dem-dikk/app.js` (formulaire contact) | Le concept préparait un e-mail vers la **vraie** adresse de Dakar Dem Dikk : confusion, faux signalements | Le formulaire affiche un message « démo, aucun message n'est envoyé » | ✅ Corrigé |
| 5 | 🟡 Moyen | Conformité (loi 2008-12) | Tout le site | Pas de mentions légales ni de politique de confidentialité | Pages `/mentions-legales` et `/politique-de-confidentialite` créées, liées dans le pied de page et sous chaque formulaire | ✅ Corrigé (NINEA/RCCM à ajouter si immatriculé) |
| 6 | 🟡 Moyen | A02 / DNS | Zone DNS de codecréa.com | Pas de SPF ni DMARC : n'importe qui peut envoyer des e-mails « de » `@codecréa.com` | Ajouter les enregistrements ci-dessous | ⏳ À faire (toi) |
| 7 | 🔵 Faible | A05 Injection (XSS) | `projets/dem-dikk/app.js:226` | Le texte tapé dans le filtre des lignes était réinséré en HTML (self-XSS, non exploitable par lien) | Échappement de `& < > " '` avant affichage | ✅ Corrigé |
| 8 | 🔵 Faible | A10 Conditions exceptionnelles | `projets/dem-dikk/app.js:263` | Une ancre d'URL invalide faisait planter le script | `try/catch` autour de `querySelector(location.hash)` | ✅ Corrigé |
| 9 | 🔵 Faible | A02 | `projets/dem-dikk/comparaison.html` | Script inline (empêchait une CSP sans `'unsafe-inline'`) | Déplacé dans `comparaison.js` | ✅ Corrigé |
| 10 | 🔵 Faible | A01 / bonnes pratiques | 105 liens `target="_blank"` | Fuite du référent vers les sites externes | `rel="noopener noreferrer"` | ✅ Corrigé |
| 11 | 🔵 Faible | Vie privée (2008-12) | Toutes les pages | Google Fonts transmet l'IP des visiteurs à Google (transfert hors Sénégal) | Héberger les polices Inter et Sora sur le serveur | 💡 Recommandé |
| 12 | 🔵 Faible | A02 / DNS | Zone DNS | Pas d'enregistrement CAA | `CAA 0 issue "letsencrypt.org"` | ⏳ À faire (toi) |
| 13 | 🔵 Faible | A09 Journalisation et alertes | — | Pas d'alerte si le site tombe | UptimeRobot ou Better Stack (gratuit) | ⏳ À faire (toi) |
| 14 | ❓ À vérifier | Phase 5 Serveur | VPS | Inconnu : SSH (root, mot de passe), UFW, fail2ban, mises à jour auto | Vérification en lecture seule, après ton accord | ⏳ En attente d'accord |
| 15 | ℹ️ Info | — | `projets/air-senegal/contact.html` | Le concept affiche les vrais contacts publics d'Air Sénégal (simples liens, rien n'est envoyé) | Aucun ; le concept est bien signalé « non officiel » | — |

### Points vérifiés et conformes
- **A04 Cryptographie** : HTTPS partout, HTTP → HTTPS en 308, TLS 1.0/1.1 refusés, certificat Let's Encrypt renouvelé automatiquement, HSTS 1 an.
- **A02** : `.git`, `.env`, `Dockerfile`, `Caddyfile`, sauvegardes : tous en 404. Pas de listing de dossiers. En-tête `Server` supprimé.
- **Phase 4 Secrets** : scan des fichiers suivis et de tout l'historique git (clés AWS, Stripe, GitHub, Slack, clés privées, mots de passe) : **aucun secret**. Les seules correspondances sont des modèles 3D encodés en base64.
- **Réseau** : seuls les ports 22, 80 et 443 répondent depuis Internet. Aucune base de données exposée.
- **Docker** : conteneur en lecture seule, toutes les capacités retirées sauf `NET_BIND_SERVICE`, `no-new-privileges`, limites mémoire/CPU.

### Non applicable (site statique)
A01 contrôle d'accès / IDOR / multi-tenant, A03 dépendances npm/composer (aucune), A05 injection SQL/commandes (pas de serveur applicatif), A06 paiements et webhooks, A07 authentification / sessions / JWT, A08 uploads et désérialisation, Phase 7 CSRF et rate limiting des formulaires (aucun envoi au serveur), Phase 8 sauvegarde de BDD (pas de BDD ; le code est sur GitHub et des copies du site sont gardées sur le VPS).

## Plan d'action

- 🔴 **Aujourd'hui** : rien de critique.
- 🟠 **Cette semaine** : mettre en ligne ce lot (en-têtes + CSP en Report-Only) → après quelques jours sans violation, passer la CSP en mode bloquant. Vérifier le serveur (phase 5).
- 🟡 **Ce mois** : enregistrements DNS SPF/DMARC/CAA, mentions légales + politique de confidentialité, monitoring de disponibilité.
- 🔵 **Plus tard** : héberger les polices localement, ajouter `includeSubDomains` à HSTS (après vérification de tous les sous-domaines), CI de sécurité sur GitHub.

## Ce que tu dois faire toi-même (hors code)

1. **DNS** (chez ton registrar, pour `codecréa.com`). Le domaine n'envoie pas d'e-mails aujourd'hui (pas de MX) :
   - `TXT  @        "v=spf1 -all"` → aucun serveur n'a le droit d'envoyer pour ce domaine
   - `TXT  _dmarc   "v=DMARC1; p=reject; adkim=s; aspf=s"` → les faux e-mails sont rejetés
   - `CAA  @        0 issue "letsencrypt.org"` → seul Let's Encrypt peut émettre un certificat
   - Si un jour tu crées des adresses `@codecréa.com`, il faudra adapter SPF et ajouter DKIM, en commençant DMARC en `p=none`.
   - Activer **DNSSEC**, le **verrouillage de transfert** et le **renouvellement automatique** du domaine.
2. **2FA** sur GitHub, sur le compte de l'hébergeur du VPS et chez le registrar du domaine.
3. **Monitoring** : créer un moniteur HTTPS gratuit sur UptimeRobot ou Better Stack pour `https://codecréa.com`, avec alerte par e-mail ou WhatsApp.
4. **CDP (Commission de Protection des Données Personnelles)** : le site lui-même ne stocke pas de données. Mais les demandes reçues par WhatsApp ou e-mail (nom, téléphone, projet) sont des données personnelles que tu traites : vérifie auprès de la CDP si une **déclaration** de ce traitement est nécessaire, et mentionne-le dans la politique de confidentialité. Les services utilisés (WhatsApp, Gmail, Google Fonts) impliquent un transfert hors du Sénégal, à indiquer aussi.
5. **Informations pour les pages légales** : forme juridique, numéro NINEA / RCCM, adresse, responsable de la publication, hébergeur du VPS.
6. **Cloudflare (facultatif)** : le plan gratuit ajouterait un pare-feu, une protection DDoS et masquerait l'IP du serveur. Attention : il faut alors changer les serveurs DNS du domaine, ce qui demande une préparation.

## Checklist de maintenance mensuelle

- [ ] Tester https://securityheaders.com, https://developer.mozilla.org/fr/observatory et https://www.ssllabs.com/ssltest/ sur codecréa.com
- [ ] Vérifier que le certificat a bien été renouvelé (expiration > 30 jours)
- [ ] Sur le VPS : `apt update && apt upgrade`, `docker compose pull && docker compose up -d --build` (nouvelle image Caddy)
- [ ] Lire les tentatives bloquées par fail2ban et les connexions SSH
- [ ] Supprimer les vieilles copies `/opt/codecrea.bak-*` (en garder 2)
- [ ] Vérifier que le moniteur de disponibilité n'a pas signalé de panne
- [ ] Revoir les comptes ayant accès à GitHub, au VPS et au registrar
