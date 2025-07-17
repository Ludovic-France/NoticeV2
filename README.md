# NoticeV2
Ecrire simplement des notices professionnelles

## Sauvegarde automatique

La rédaction est maintenant sauvegardée dans le navigateur toutes les 30 secondes. Ainsi, en cas de rafraîchissement ou de fermeture accidentelle, la dernière version est restaurée à l'ouverture suivante.

Les données sont stockées dans le *localStorage* sous la clé `notice_v2_autosave`. Si vous souhaitez repartir d'une page blanche ou si la sauvegarde automatique pose problème, ouvrez les outils de développement de votre navigateur. Dans l'onglet **Application** (ou **Stockage**), repérez la section **Local Storage** puis supprimez l'entrée `notice_v2_autosave`. Vous pouvez aussi exécuter la commande suivante dans la console&nbsp;:

```javascript
localStorage.removeItem('notice_v2_autosave');
```
