// constante.js

// Définition des objets pour chaque risque/émission
const Laser = {
    id: "Laser", // Correspond à l'ID de la checkbox
    chapitreTargetName: "Substance et émission", // Titre H1 du chapitre où insérer ce contenu
    titreType: "h4",
    titreText: "Risques liés au Laser",
    contenuHTML: "<p><strong>Description du risque Laser:</strong> La machine utilise un laser de classe [Classe Laser]. Des expositions directes ou indirectes au faisceau peuvent causer des lésions oculaires graves et des brûlures cutanées. Se référer au manuel spécifique du laser pour les détails techniques et les procédures de sécurité complètes.</p><ul><li>Ne jamais regarder directement le faisceau laser.</li><li>Porter les équipements de protection individuelle (EPI) fournis et spécifiés (lunettes de protection adaptées à la longueur d'onde).</li><li>S'assurer que les carters de protection et les sécurités associées sont en place et fonctionnels.</li><li>Limiter l'accès à la zone laser aux personnes formées et autorisées.</li></ul>"
};

const Fumee = {
    id: "Fumee",
    chapitreTargetName: "Substance et émission",
    titreType: "h4",
    titreText: "Émission de Fumées et Gaz",
    contenuHTML: "<p><strong>Description des émissions de fumées/gaz:</strong> Certains processus de la machine (soudure, découpe thermique, utilisation de produits chimiques) peuvent générer des fumées, des vapeurs ou des gaz potentiellement nocifs. Une inhalation prolongée ou répétée peut entraîner des problèmes respiratoires ou d'autres effets sur la santé.</p><ul><li>Utiliser la machine dans un endroit bien ventilé.</li><li>S'assurer que les systèmes d'aspiration et de filtration localisés sont actifs et entretenus.</li><li>Porter les protections respiratoires (masques) appropriées si indiqué par l'évaluation des risques.</li><li>Consulter les Fiches de Données de Sécurité (FDS) des produits chimiques utilisés.</li></ul>"
};

const Poussiere = {
    id: "Poussiere",
    chapitreTargetName: "Substance et émission",
    titreType: "h4",
    titreText: "Émission de Poussières",
    contenuHTML: "<p><strong>Description des émissions de poussières:</strong> Le traitement de certains matériaux peut produire des poussières fines. L'inhalation de ces poussières peut être irritante ou toxique selon la nature du matériau.</p><ul><li>Utiliser les systèmes de captage à la source lorsque disponibles.</li><li>Nettoyer régulièrement les postes de travail par aspiration (ne pas balayer à sec si possible).</li><li>Porter un masque anti-poussières adapté (par ex. FFP2/FFP3) si l'empoussièrement est significatif.</li></ul>"
};

const IR = {
    id: "IR",
    chapitreTargetName: "Rayonnements",
    titreType: "h4",
    titreText: "Rayonnement Infrarouge (IR)",
    contenuHTML: "<p><strong>Description du risque lié au rayonnement Infrarouge:</strong> Des sources de chaleur intense (fours, éléments chauffants, métal en fusion) peuvent émettre un rayonnement infrarouge important. Une exposition prolongée peut causer des brûlures cutanées, des cataractes ou d'autres lésions oculaires.</p><ul><li>Porter des vêtements de protection résistants à la chaleur et couvrant la peau.</li><li>Utiliser des protections oculaires filtrant les IR (lunettes, écrans faciaux).</li><li>Respecter les distances de sécurité par rapport aux sources intenses de chaleur.</li></ul>"
};

const UV = {
    id: "UV",
    chapitreTargetName: "Rayonnements",
    titreType: "h4",
    titreText: "Rayonnement Ultraviolet (UV)",
    contenuHTML: "<p><strong>Description du risque lié au rayonnement Ultraviolet:</strong> Certaines opérations (soudage à l'arc, lampes UV de séchage/stérilisation) produisent un rayonnement UV intense. L'exposition peut causer des coups de soleil (érythème), des lésions oculaires (photokératite, cataracte) et augmenter le risque de cancer de la peau.</p><ul><li>Ne jamais regarder directement les arcs de soudage ou les sources UV sans protection.</li><li>Utiliser des écrans de protection opaques ou filtrant les UV.</li><li>Porter des vêtements couvrants et des protections oculaires/faciales spécifiques anti-UV.</li></ul>"
};

// Tableau global pour un accès facile à toutes les constantes de risque.
// Cela facilitera l'itération dans app.js.
const ALL_RISKS = [Laser, Fumee, Poussiere, IR, UV];
// Rendre ALL_RISKS accessible globalement si besoin, ou le passer en argument.
// Pour l'instant, on suppose qu'il sera accessible globalement car constante.js est chargé globalement.
