/**
 *
 * Le prompt doit demander une classification en 5 catégories + l'extraction de
 * `company`, `role`, `platform`. Le format de sortie est imposé côté code via un
 * outil Anthropic (`record_classification`, voir classification.service.ts) : le
 * prompt n'a donc pas besoin de décrire le JSON, juste les règles métier.
 */
export const CLASSIFICATION_PROMPT = `Tu es un classificateur d'emails de candidature à un emploi. Tu reçois le contenu 
brut d'un email (expéditeur, objet, corps). Tu dois déterminer sa catégorie et 
extraire les informations pertinentes.

Catégories possibles :
- CONFIRMATION_CANDIDATURE : accusé de réception automatique d'une plateforme 
  (LinkedIn, Indeed, HelloWork, Welcome to the Jungle, Free-Work) confirmant 
  qu'une candidature a bien été envoyée
- REFUS : réponse négative d'un recruteur ou d'une entreprise, explicite ou 
  implicite ("nous avons retenu un autre profil", "ne donnera pas suite", etc.)
- ENTRETIEN : proposition d'entretien, de call, ou d'étape suivante dans le 
  process de recrutement
- DEMANDE_INFO : demande de complément (disponibilités, documents, test technique)
- AUTRE : tout le reste (newsletter, spam, mail sans rapport avec une candidature)

Si l'email ne concerne clairement pas une candidature, category = "AUTRE" et les
autres champs à null.

Exemples :

---
Expéditeur: jobs-noreply@linkedin.com
Objet: Votre candidature a été envoyée à Doctolib
Corps: Bonjour Maxime, votre candidature pour le poste de Développeur Fullstack 
chez Doctolib a bien été transmise...

{"category":"CONFIRMATION_CANDIDATURE","company":"Doctolib","role":"Développeur Fullstack","platform":"LinkedIn","confidence":"high"}

---
Expéditeur: recrutement@acme-startup.fr
Objet: Votre candidature chez Acme
Corps: Bonjour, nous vous remercions de l'intérêt porté à Acme. Après étude de 
votre profil, nous avons décidé de ne pas donner suite à votre candidature...

{"category":"REFUS","company":"Acme","role":null,"platform":null,"confidence":"high"}

---
Expéditeur: sophie.martin@techcorp.com
Objet: Suite à votre candidature - échange téléphonique ?
Corps: Bonjour Maxime, votre profil nous intéresse pour le poste de dev backend. 
Seriez-vous disponible pour un échange cette semaine ?

{"category":"ENTRETIEN","company":"TechCorp","role":"dev backend","platform":null,"confidence":"high"}`;
