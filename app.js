/* ----------- Données et variables globales ----------- */
let selectedPage = 0;
let pages = []; // Contient les pages de la notice
let selectedElement = null; // Élément sélectionné
let orientation = []; // Pour chaque page
const INDEX_REV = "ENR-063-04"; // Valeur fixe par défaut
const NUM_REF = "900000"; // Modifiable uniquement page 1
// NOUVEAU: Retrait de COLOR_DROP qui n'est plus nécessaire pour les drop-target
s
let isResizingCol = false;

// Fonction pour générer des ID uniques pour les nouveaux objets
function generateUniqueId() {
    return 'obj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function normalizeColWidths(tableObj) {
    if (!tableObj.colWidths || tableObj.colWidths.length === 0) return;

    let currentSum = 0;
    // Utiliser une copie pour calculer la somme pour éviter les problèmes avec
parseFloat sur des valeurs déjà modifiées
    const widthsToSum = [...tableObj.colWidths];
    widthsToSum.forEach(w => currentSum += parseFloat(w));

    if (currentSum > 0) {
        const factor = 100 / currentSum;
        let runningTotal = 0;
        for (let i = 0; i < tableObj.colWidths.length - 1; i++) {
            const newWidth = parseFloat(widthsToSum[i]) * factor; // Utiliser la
 largeur originale pour le calcul
            tableObj.colWidths[i] = newWidth.toFixed(2) + "%";
            runningTotal += newWidth;
        }
        tableObj.colWidths[tableObj.colWidths.length - 1] = Math.max(0, (100 - r
unningTotal)).toFixed(2) + "%";
    } else if (tableObj.colWidths.length > 0) {
        const equalShare = (100 / tableObj.colWidths.length);
        let runningTotal = 0;
        for (let i = 0; i < tableObj.colWidths.length - 1; i++) {
            tableObj.colWidths[i] = equalShare.toFixed(2) + "%";
            runningTotal += equalShare;
        }
        tableObj.colWidths[tableObj.colWidths.length - 1] = Math.max(0, (100 - r
unningTotal)).toFixed(2) + "%";
    }
}

// ---- Initialisation principale au chargement ----
window.onload = () => {
    initIcons();
    initDocument();
    setupDragNDrop();
    // Initial calculation of chapter numbers and TOC
    updateAllChapterNumbers();

    // Gestion globale de la touche Shift pour le curseur et le drag&drop
    document.addEventListener('keydown', e => {
        if (e.key === 'Shift') {
            document.body.classList.add('shift-key-down');
        }
    });
    document.addEventListener('keyup', e => {
        if (e.key === 'Shift') {
            document.body.classList.remove('shift-key-down');
        }
    });
    // Gère le cas où l'utilisateur quitte la fenêtre avec Shift enfoncé
    window.addEventListener('blur', () => {
        document.body.classList.remove('shift-key-down');
    });
};

// ----- Initialisation de la collection de pictogrammes -----
function initIcons() {
    const iconList = document.getElementById('icons-list');
    iconList.innerHTML = "";
    if (typeof IconData !== "undefined") {
        IconData.forEach((icon, idx) => {
            let img = document.createElement('img');
            img.src = icon.url;
            img.title = icon.title;
            img.draggable = true;
            img.classList.add("icon-picto");
            img.setAttribute('data-icon', idx);
            // Drag
            img.addEventListener('dragstart', evt => {
                evt.dataTransfer.setData("type", "icon");
                evt.dataTransfer.setData("icon", idx);
            });
            iconList.appendChild(img);
        });
    }
}

// ------ Création initiale du document ------
function initDocument() {
    // Construction initiale selon chapitre-data.js
    pages = [];
    orientation = [];
    // 1ère page : Couverture
    pages.push({
        type: 'cover',
        title: "Notice : Machine d'assemblage",
        docTitle: "Titre du document",
        img: null,
        editableNum: NUM_REF
    });
    orientation.push("portrait");
    // 2ème page : Sommaire
    pages.push({
        type: 'toc'
    });
    orientation.push("portrait");
    // Pages par chapitre
    if (typeof ChapitreData !== "undefined") {
        ChapitreData.forEach(chapEntry => {
            let currentChapterPageObjects = [];

            if (chapEntry.H1) {
                if (currentChapterPageObjects.length > 0) { // Devrait être vide
, mais par sécurité
                    pages.push({ type: 'chapter', objects: currentChapterPageObj
ects });
                    orientation.push("portrait");
                    currentChapterPageObjects = [];
                }

                currentChapterPageObjects.push({
                    type: "h1",
                    text: chapEntry.H1,
                    originalText: chapEntry.H1,
                    id: chapEntry.id || generateUniqueId()
                });
            }

            if (chapEntry.H2_items && Array.isArray(chapEntry.H2_items)) {
                chapEntry.H2_items.forEach(h2Entry => {
                    if (h2Entry.H2) {
                        // Si currentChapterPageObjects contient déjà quelque ch
ose (H1 ou H2/H3 précédent),
                        // ce H2 commence sur une nouvelle page.
                        if (currentChapterPageObjects.length > 0) {
                            pages.push({ type: 'chapter', objects: currentChapte
rPageObjects });
                            orientation.push("portrait");
                            currentChapterPageObjects = [];
                        }

                        currentChapterPageObjects.push({
                            type: "h2",
                            text: h2Entry.H2,
                            originalText: h2Entry.H2,
                            id: h2Entry.id || generateUniqueId()
                        });

                        if (h2Entry.H3_items && Array.isArray(h2Entry.H3_items))
 {
                            h2Entry.H3_items.forEach(h3Entry => {
                                if (h3Entry.H3) {
                                    currentChapterPageObjects.push({
                                        type: "h3",
                                        text: h3Entry.H3,
                                        originalText: h3Entry.H3,
                                        id: h3Entry.id || generateUniqueId()
                                    });
                                    // Gérer H4 ici si nécessaire, en les ajouta
nt à currentChapterPageObjects
                                }
                            });
                        }
                    }
                });
            }

            // À la fin du traitement d'un chapEntry (qui peut contenir un H1 et
/ou plusieurs H2),
            // s'il reste des objets dans currentChapterPageObjects, ils forment
 la dernière page de ce bloc.
            if (currentChapterPageObjects.length > 0) {
                pages.push({ type: 'chapter', objects: currentChapterPageObjects
 });
                orientation.push("portrait");
            }
        });
    }
    renderDocument();
}

/* --------- Affichage du document complet ---------- */
function renderDocument() {
    const container = document.getElementById('pages-container');
    container.innerHTML = '';

    pages.forEach((page, idx) => {
        let div = renderPage(page, idx);
        div.onclick = (e) => {
            selectedPage = idx;
            updateSelectionClass();
            e.stopPropagation();
        };
        if (idx === selectedPage) div.classList.add("selected");
        container.appendChild(div);
    });
    updateSelectionClass();
}

// =================== NOUVELLES FONCTIONS DE GLISSER-DÉPOSER ==================
=

/**
 * Gère le survol d'un objet sur une zone de contenu de chapitre.
 * Affiche un indicateur de position pour le dépôt.
 * @param {DragEvent} event - L'événement de dragover.
 * @param {HTMLElement} container - L'élément conteneur (.chapter-objects).
 */
function handleDragOverChapter(event, container) {
    event.preventDefault();

    let indicator = document.getElementById('drop-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'drop-indicator';
        // On l'ajoute au conteneur courant pour qu'il soit positionné correctem
ent
        container.appendChild(indicator);
    } else {
        // S'il existe mais n'est pas dans le bon conteneur, on le déplace
        if(indicator.parentNode !== container) {
            container.appendChild(indicator);
        }
    }
    indicator.style.display = 'block';

    const draggables = [...container.children].filter(child => child.draggable);
    let nextElement = null;

    for (const child of draggables) {
        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (event.clientY < midY) {
            nextElement = child;
            break;
        }
    }

    if (nextElement) {
        container.insertBefore(indicator, nextElement);
    } else {
        container.appendChild(indicator);
    }
}

/**
 * Cache l'indicateur lorsque le glissement quitte la zone.
 */
function handleDragLeaveChapter() {
    const indicator = document.getElementById('drop-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Gère la dépose d'un objet dans une zone de chapitre.
 * @param {DragEvent} event - L'événement de drop.
 * @param {number} pageIdx - L'index de la page de destination.
 */
function handleDropInChapter(event, pageIdx) {
    event.preventDefault();
    const indicator = document.getElementById('drop-indicator');
    if (!indicator) return;

    // Calculer l'index de dépose avant de cacher l'indicateur
    let dropIndex = 0;
    // La logique de calcul est plus simple : on compte le nombre d'éléments dra
ggables avant l'indicateur
    for (const child of indicator.parentNode.children) {
        if (child.id === 'drop-indicator') break;
        if (child.draggable) dropIndex++;
    }

    indicator.style.display = 'none'; // Cacher l'indicateur

    const moveOidStr = event.dataTransfer.getData('move-obj-oid');
    const movePageStr = event.dataTransfer.getData('move-obj-page');
    const type = event.dataTransfer.getData("type");
    let refreshNeeded = false;

    const destPage = pages[pageIdx];

    if (type) { // Dépose d'un nouvel objet depuis la barre d'outils
        let newObj = null;
        if (["h1", "h2", "h3", "h4"].includes(type))
            newObj = { type: type, text: type.toUpperCase(), originalText: type.
toUpperCase(), id: generateUniqueId() };
        else if (type === "text")
            newObj = { type: "text", html: "Zone de texte" };
        else if (type === "table")
            newObj = { type: "table", rows: [["", "", ""], ["", "", ""], ["", ""
, ""]] };

        if (newObj) {
            destPage.objects.splice(dropIndex, 0, newObj);
            refreshNeeded = true;
        }
    } else if (moveOidStr !== "" && movePageStr !== "") { // Déplacement d'un ob
jet existant
        const srcPageIdx = parseInt(movePageStr);
        const srcOid = parseInt(moveOidStr);
        const srcPage = pages[srcPageIdx];

        if (srcPage && Array.isArray(srcPage.objects) && srcOid < srcPage.object
s.length) {
            if (srcPageIdx === pageIdx) { // Déplacement sur la même page
                if (srcOid === dropIndex || srcOid + 1 === dropIndex) return; //
 Ne rien faire si on le déplace au même endroit

                const [objMoved] = srcPage.objects.splice(srcOid, 1);
                // Si on déplace vers le bas, l'index de destination diminue de
1
                const finalDropIndex = (srcOid < dropIndex) ? dropIndex - 1 : dr
opIndex;
                destPage.objects.splice(finalDropIndex, 0, objMoved);

                // Mettre à jour la sélection pour qu'elle suive l'objet
                selectedElement = { pageIdx: pageIdx, objIdx: finalDropIndex, ty
pe: objMoved.type };
                refreshNeeded = true;

            } else { // Déplacement vers une autre page
                const [objMoved] = srcPage.objects.splice(srcOid, 1);
                destPage.objects.splice(dropIndex, 0, objMoved);

                // Mettre à jour la sélection
                selectedElement = { pageIdx: pageIdx, objIdx: dropIndex, type: o
bjMoved.type };

                refreshNeeded = true;
                paginatePage(srcPageIdx); // Paginer l'ancienne page
            }
        }
    }

    if (refreshNeeded) {
        updateAllChapterNumbers(); // Appeler la fonction principale qui gère le
 rendu et la pagination
        paginatePage(pageIdx);
    }
}


/* --------- Affichage d'une page ---------- */
function renderPage(page, idx) {
    let div = document.createElement('div');
    div.className = "page";
    if (orientation[idx] === "landscape") div.classList.add("landscape");

    let header = document.createElement('div');
    header.className = "header";
    let logo = document.createElement('img');
    logo.className = "logo";
    logo.src = (typeof logoData !== "undefined" ? logoData.url : "");
    header.appendChild(logo);
    let docTitle = document.createElement('div');
    docTitle.className = "doc-title";
    if (idx === 0) {
        docTitle.contentEditable = "true";
        docTitle.spellcheck = false;
        docTitle.innerText = page.docTitle || "Titre du document";
        docTitle.addEventListener('blur', function() {
            pages[0].docTitle = docTitle.innerText;
        });
    } else {
        docTitle.innerText = pages[0].docTitle || "Titre du document";
    }
    header.appendChild(docTitle);
    let revBox = document.createElement('div');
    revBox.className = "revision";
    revBox.innerHTML = `
        <div class="index">${INDEX_REV}</div>
        <div class="num" contenteditable="${idx === 0 ? 'true' : 'false'}" spell
check="false">${pages[0].editableNum || "900000"}</div>
    `;
    if (idx === 0) {
        let numDiv = revBox.querySelector('.num');
        numDiv.addEventListener('blur', function() {
            pages[0].editableNum = numDiv.innerText;
        });
    }
    header.appendChild(revBox);
    div.appendChild(header);

    let content = document.createElement('div');
    content.className = "content";

    if (idx === 0) {
        let title = document.createElement('div');
        title.contentEditable = "true";
        title.style.fontSize = "30pt";
        title.className = "doc-title";
        title.innerText = page.title || "Notice : Untel";
        title.addEventListener('blur', function() {
            page.title = title.innerText;
        });
        title.onclick = function(e) {
            selectedElement = { pageIdx: idx, objIdx: "mainTitle", type: "mainTi
tle" };
            document.querySelectorAll('.selected').forEach(n => n.classList.remo
ve('selected'));
            title.classList.add('selected');
            e.stopPropagation();
        };
        if (selectedElement && selectedElement.pageIdx === idx && selectedElemen
t.objIdx === "mainTitle")
            title.classList.add('selected');
        content.appendChild(title);

        let imgDrop = document.createElement('div');
        imgDrop.className = "img-drop";
        imgDrop.innerHTML = page.img ? `<img src="${page.img}" alt="image">` : '
<span>Glissez une image ici</span>';
        imgDrop.ondragover = e => { e.preventDefault(); imgDrop.style.background
 ="#eef"; };
        imgDrop.ondragleave = e => { imgDrop.style.background=""; };
        imgDrop.ondrop = e => {
            e.preventDefault();
            imgDrop.style.background="";
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image')) {
                let reader = new FileReader();
                reader.onload = evt => {
                    page.img = evt.target.result;
                    renderDocument();
                };
                reader.readAsDataURL(file);
            }
        };
        imgDrop.addEventListener('paste', e => {
            e.preventDefault();
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = () => {
                        imgDrop.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = reader.result;
                        img.style.maxWidth  = '100%';
                        img.style.maxHeight = '100%';
                        imgDrop.appendChild(img);
                        page.img = reader.result;
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
            const url = e.clipboardData.getData('text/uri-list') || e.clipboardD
ata.getData('text/plain');
            if (url && /^https?:\/\//.test(url)) {
                fetch(url)
                    .then(r => r.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            imgDrop.innerHTML = '';
                            const img = document.createElement('img');
                            img.src = reader.result;
                            img.style.maxWidth  = '100%';
                            img.style.maxHeight = '100%';
                            imgDrop.appendChild(img);
                            page.img = reader.result;
                        };
                        reader.readAsDataURL(blob);
                    })
                    .catch(console.error);
            }
        });
        content.appendChild(imgDrop);
                let constructeurBlock = document.createElement('div');
                constructeurBlock.className = "constructeur-info";
                constructeurBlock.style.border = "2px solid #000";
                constructeurBlock.style.padding = "10px";
                constructeurBlock.style.marginTop = "20px";
                constructeurBlock.style.fontSize = "12pt";
                constructeurBlock.style.textAlign = "left";
                constructeurBlock.innerHTML = "<b>Constructeur : APA <br>Adresse
 :</b> 292 Rue de l'Epinette, 76320 CAUDEBEC Lès ELBEUF <br>☎️ +33 2.32.96.26.60
";
                content.appendChild(constructeurBlock);
    } else if (page.type === 'toc') { // TOC Principale (idx === 1 habituellemen
t)
        let tocMainTitle = document.createElement('h2');
        tocMainTitle.innerText = "Sommaire";
                tocMainTitle.style.padding = '0';
                tocMainTitle.style.margin = '0';
        content.appendChild(tocMainTitle);

        let tocOl = document.createElement("ol");
        tocOl.id = "table-of-contents";
        tocOl.style.fontSize = "1em";
        tocOl.style.margin   = "0 0 0 24px";
        tocOl.style.padding  = "0";

        // Générer toutes les entrées du sommaire basées sur les titres des page
s de chapitre
        let itemsAddedToTOC = 0;
        for (let i = 2; i < pages.length; i++) { // Commencer à vérifier à parti
r de la page d'index 2
            const p = pages[i];
            if (p.type === 'toc_continued') continue;

            if (Array.isArray(p.objects)) {
                p.objects.forEach(obj => {
                    if (/^h[1-4]$/.test(obj.type) && (obj.originalText || obj.te
xt)) {
                        let li = document.createElement("li");
                        const prefix = obj.calculatedPrefix || "";
                        const textValue = obj.originalText || obj.text || "";
                        const pageNumberOfTitle = i + 1;
                        const anchor = document.createElement('a');
                        anchor.href = `#live-title-${obj.id}`;
                        anchor.innerHTML = `<span class="toc-title">${prefix}${t
extValue}</span><span class="toc-page-num">${pageNumberOfTitle}</span>`;
                        li.appendChild(anchor);
                        const level = parseInt(obj.type[1]);
                        li.style.marginLeft = `${(level - 1) * 20}px`;
                        tocOl.appendChild(li);
                        itemsAddedToTOC++;
                    }
                });
            }
        }
        content.appendChild(tocOl);
        if (itemsAddedToTOC === 0 && pages.length > 2) {
            console.warn("TOC RENDER: Aucun titre (h1-h4) trouvé dans les pages
de chapitre pour générer le sommaire.");
        }
    } else if (page.type === 'toc_continued') {
        let tocContinuedTitle = document.createElement('h2');
        tocContinuedTitle.innerText = "Sommaire (suite)";
        content.appendChild(tocContinuedTitle);

        let tocOl = document.createElement("ol");
        tocOl.id = "table-of-contents";
        tocOl.style.fontSize = "1.1em";
        tocOl.style.margin   = "0 0 0 24px";
        tocOl.style.padding  = "0";

        if (Array.isArray(page.tocItemsToRender)) {
            page.tocItemsToRender.forEach(liNode => {
                tocOl.appendChild(liNode);
            });
        }
        content.appendChild(tocOl);
    }
    else { // Pages de chapitre (type 'chapter' ou 'custom')
        if (!Array.isArray(page.objects)) page.objects = [];
        let objs = document.createElement('div');
        objs.className = "chapter-objects";

        objs.addEventListener('dragover', (e) => handleDragOverChapter(e, objs))
;
        objs.addEventListener('dragleave', handleDragLeaveChapter);
        objs.addEventListener('drop', (e) => handleDropInChapter(e, idx));

        page.objects.forEach((obj, oid) => {
            let el = null;
            if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
                el = document.createElement("div");
                el.contentEditable = "true";
                el.className = "chapter-title " + obj.type;
                if (obj.id) {
                    el.id = `live-title-${obj.id}`;
                }
                el.innerText = (obj.calculatedPrefix || "") + (obj.originalText
|| obj.text || "");
                el.addEventListener("blur", () => {
                    const currentText = el.innerText;
                    const prefix = obj.calculatedPrefix || "";
                    if (currentText.startsWith(prefix)) {
                        obj.originalText = currentText.substring(prefix.length);
                    } else {
                        obj.originalText = currentText;
                    }
                    obj.text = obj.originalText;
                    paginatePage(idx);
                });
            } else if (obj.type === "text") {
                                el = document.createElement('div');
                                el.contentEditable = "true";
                                el.className = "rte-area";
                                el.innerHTML = obj.html || "";

                                const insertImageIntoRTE = (targetDiv, imageSrc)
 => {
                                        const img = document.createElement('img'
);
                                        img.src = imageSrc;
                                        img.style.maxWidth = '100%';
                                        img.style.maxHeight = '300px';
                                        img.style.display = 'block';
                                        img.style.margin = '10px 0';
                                        img.style.objectFit = "contain";

                                        const selection = window.getSelection();
                                        if (selection.rangeCount > 0 && selectio
n.anchorNode && targetDiv.contains(selection.anchorNode)) {
                                                const range = selection.getRange
At(0);
                                                range.deleteContents();
                                                range.insertNode(img);
                                                const newRange = document.create
Range();
                                                newRange.setStartAfter(img);
                                                newRange.collapse(true);
                                                selection.removeAllRanges();
                                                selection.addRange(newRange);
                                        } else {
                                                targetDiv.appendChild(img);
                                        }
                                        paginatePage(idx);
                                };

                                el.addEventListener('paste', e => {
                                        const items = (e.clipboardData || window
.clipboardData).items;
                                        for (let item of items) {
                                                if (item.kind === 'file' && item
.type.startsWith('image/')) {
                                                        e.preventDefault();
                                                        const file = item.getAsF
ile();
                                                        const reader = new FileR
eader();
                                                        reader.onload = () => {
                                                                insertImageIntoR
TE(el, reader.result);
                                                        };
                                                        reader.readAsDataURL(fil
e);
                                                        return;
                                                }
                                        }
                                });

                                el.addEventListener('dragover', e => {
                                        e.preventDefault();
                                        el.style.outline = "2px dashed #4078d6";
                                });

                                el.addEventListener('dragleave', () => {
                                        el.style.outline = "none";
                                });

                                el.addEventListener('drop', e => {
                                        e.preventDefault();
                                        el.style.outline = "none";

                                        const dataType = e.dataTransfer.getData(
"type");

                                        if (dataType === "icon") {
                                                const iconIndex = parseInt(e.dat
aTransfer.getData("icon"), 10);
                                                if (typeof IconData !== "undefin
ed" && IconData[iconIndex]) {
                                                        insertImageIntoRTE(el, I
conData[iconIndex].url);
                                                }
                                        } else if (e.dataTransfer.files.length >
 0) {
                                                const file = e.dataTransfer.file
s[0];
                                                if (file.type.startsWith("image/
")) {
                                                        const reader = new FileR
eader();
                                                        reader.onload = () => {
                                                                insertImageIntoR
TE(el, reader.result);
                                                        };
                                                        reader.readAsDataURL(fil
e);
                                                }
                                        } else {
                                                const text = e.dataTransfer.getD
ata('text/plain');
                                                if (text) {
                                                        document.execCommand('in
sertText', false, text);
                                                }
                                        }
                                });

                                el.addEventListener('blur', function() {
                                        obj.html = el.innerHTML;
                                        paginatePage(idx);
                                });
            } else if (obj.type === "table") {
                                if (obj.headerShaded === undefined) obj.headerSh
aded = false;
                                el = document.createElement('div');
                                el.className = "table-container";
                                let containerWidth = orientation[idx] === "portr
ait" ? 710 : 1038;
                                let table = document.createElement('table');
                                table.className = "page-table";
                                table.style.width = containerWidth + "px";
                                table.style.maxWidth = containerWidth + "px";
                                table.style.tableLayout = "fixed";
                                let firstRow = obj.rows.find(r => r && r.length)
;
                                let nbCols = firstRow ? firstRow.length : 2;
                                if (!obj.colWidths || obj.colWidths.length !== n
bCols) {
                                        let defaultPx = containerWidth / nbCols;
                                        obj.colWidths = Array(nbCols).fill(defau
ltPx);
                                } else {
                                        let total = obj.colWidths.reduce((a, b)
=> a + parseFloat(b || 0), 0);
                                        if (total === 0 && nbCols > 0) {
                                                let defaultPx = containerWidth /
 nbCols;
                                                obj.colWidths = Array(nbCols).fi
ll(defaultPx);
                                                total = containerWidth;
                                        }
                                        if (total > 0) {
                                                let scale = containerWidth / tot
al;
                                                obj.colWidths = obj.colWidths.ma
p(w => parseFloat(w || 0) * scale);
                                        }
                                }
                                let colgroup = document.createElement('colgroup'
);
                                let accumulated = 0;
                                for (let c = 0; c < nbCols; c++) {
                                        let col = document.createElement('col');
                                        let width = Math.round(obj.colWidths[c])
;
                                        if (c === nbCols - 1) width = containerW
idth - accumulated;
                                        else accumulated += width;
                                        obj.colWidths[c] = width;
                                        col.style.width = width + "px";
                                        colgroup.appendChild(col);
                                }
                                table.appendChild(colgroup);
                                let tbody = document.createElement('tbody');

                                const insertImageIntoCell = (targetCell, imageSr
c) => {
                                        const img = document.createElement('img'
);
                                        img.src = imageSrc;
                                        img.style.maxWidth = "100%";
                                        img.style.maxHeight = "800px";
                                        img.style.objectFit = "contain";
                                        img.style.verticalAlign = "middle";

                                        const selection = window.getSelection();
                                        if (selection.rangeCount > 0 && selectio
n.anchorNode && targetCell.contains(selection.anchorNode)) {
                                                const range = selection.getRange
At(0);
                                                range.deleteContents();
                                                range.insertNode(img);
                                                range.setStartAfter(img);
                                                range.collapse(true);
                                                selection.removeAllRanges();
                                                selection.addRange(range);
                                        } else {
                                                targetCell.appendChild(img);
                                        }
                                        paginatePage(idx);
                                };

                                obj.rows.forEach((row, i) => {
                                        let tr = document.createElement('tr');
                                        if (i === 0 && obj.headerShaded) {
                                                tr.style.backgroundColor = "#f5f
5f5";
                                                tr.style.fontWeight = "bold";
                                        }
                                        for (let j = 0; j < (row ? row.length :
0); j++) {
                                                let cellData = row[j];
                                                if (cellData === null) continue;
                                                let td = document.createElement(
'td');
                                                td.contentEditable = "true";
                                                td.style.verticalAlign = "middle
";
                                                td.style.overflow = "hidden";
                                                td.style.position = "relative";
                                                td.addEventListener('focus', ()
=> {
                                                        const range = document.c
reateRange();
                                                        range.selectNodeContents
(td);
                                                        range.collapse(true);
                                                        const sel = window.getSe
lection();
                                                        sel.removeAllRanges();
                                                        sel.addRange(range);
                                                });

                                                if (typeof cellData === "object"
 && cellData.image) {
                                                         td.innerHTML = `<img sr
c="${cellData.image}" style="max-width:100%;  object-fit:contain; vertical-align
:middle;">`;
                                                } else {
                                                         td.innerHTML = (typeof
cellData === "object" ? cellData.text : cellData) || "";
                                                }

                                                let colspan = (typeof cellData =
== "object" && cellData.colspan) ? cellData.colspan : 1;
                                                let align = (typeof cellData ===
 "object" && cellData.align) ? cellData.align : "left";
                                                td.colSpan = colspan;
                                                td.style.textAlign = align;

                                                td.addEventListener('blur', () =
> {
                                                        if (typeof cellData ===
"object" && cellData !== null) {
                                                                cellData.text =
td.innerHTML;
                                                                delete cellData.
image;
                                                        } else {
                                                                obj.rows[i][j] =
 td.innerHTML;
                                                        }
                                                        paginatePage(idx);
                                                });

                                                td.addEventListener('paste', e =
> {
                                                        const items = (e.clipboa
rdData || window.clipboardData).items;
                                                        for (let item of items)
{
                                                                if (item.kind ==
= 'file' && item.type.startsWith('image/')) {
                                                                        e.preven
tDefault();
                                                                        const fi
le = item.getAsFile();
                                                                        const re
ader = new FileReader();
                                                                        reader.o
nload = () => {

insertImageIntoCell(td, reader.result);
                                                                        };
                                                                        reader.r
eadAsDataURL(file);
                                                                        return;
                                                                }
                                                        }
                                                });

                                                td.addEventListener('dragover',
e => e.preventDefault());
                                                td.addEventListener('drop', e =>
 {
                                                        e.preventDefault();
                                                        const dataType = e.dataT
ransfer.getData("type");

                                                        if (dataType === "icon")
 {
                                                                const iconIndex
= parseInt(e.dataTransfer.getData("icon"), 10);
                                                                if (typeof IconD
ata !== "undefined" && IconData[iconIndex]) {
                                                                        insertIm
ageIntoCell(td, IconData[iconIndex].url);
                                                                }
                                                        } else if (e.dataTransfe
r.files.length > 0) {
                                                                const file = e.d
ataTransfer.files[0];
                                                                if (file.type.st
artsWith("image/")) {
                                                                        const re
ader = new FileReader();
                                                                        reader.o
nload = () => {

insertImageIntoCell(td, reader.result);
                                                                        };
                                                                        reader.r
eadAsDataURL(file);
                                                                }
                                                        } else {
                                                                const text = e.d
ataTransfer.getData('text/plain');
                                                                if (text) {
                                                                        document
.execCommand('insertText', false, text);
                                                                }
                                                        }
                                                });

                                                td.addEventListener('contextmenu
', e => {
                                                        e.preventDefault();
                                                        showTableMenu(e, obj, i,
 j);
                                                        setTimeout(() => td.focu
s(), 0);
                                                });
                                                if (i === 0 && j < nbCols - 1) {
                                                        let resizer = document.c
reateElement('div');
                                                        resizer.className = "col
-resizer";
                                                        Object.assign(resizer.st
yle, {
                                                                position: "absol
ute", top: "0", right: "-3px", width: "6px",
                                                                height: "100%",
cursor: "col-resize", zIndex: "10"
                                                        });
                                                        td.appendChild(resizer);
                                                        resizer.addEventListener
('mousedown', e => {
                                                                e.preventDefault
();
                                                                const startX = e
.pageX;
                                                                const leftC = co
lgroup.children[j];
                                                                const rightC = c
olgroup.children[j + 1];
                                                                const wL = parse
Float(obj.colWidths[j]);
                                                                const wR = parse
Float(obj.colWidths[j + 1]);
                                                                document.body.st
yle.cursor = "col-resize";
                                                                function onMove(
ev) {
                                                                        let d =
ev.pageX - startX;
                                                                        let nl =
 wL + d, nr = wR - d;
                                                                        if (nl <
 30 || nr < 30) return;
                                                                        obj.colW
idths[j] = nl;
                                                                        obj.colW
idths[j + 1] = nr;
                                                                        leftC.st
yle.width = nl + "px";
                                                                        rightC.s
tyle.width = nr + "px";
                                                                }
                                                                function onUp()
{
                                                                        document
.removeEventListener('mousemove', onMove);
                                                                        document
.removeEventListener('mouseup', onUp);
                                                                        document
.body.style.cursor = "";
                                                                }
                                                                document.addEven
tListener('mousemove', onMove);
                                                                document.addEven
tListener('mouseup', onUp);
                                                        });
                                                }
                                                tr.appendChild(td);
                                                if (colspan > 1) {
                                                        for (let k = 1; k < cols
pan; k++) obj.rows[i][j + k] = null;
                                                        j += colspan - 1;
                                                }
                                        }
                                        tbody.appendChild(tr);
                                });
                                table.appendChild(tbody);
                                el.appendChild(table);
                        }

            if (el) {
                // CORRECTION: Logique de Drag & Drop simplifiée et corrigée
                el.classList.add('draggable-on-shift');
                el.setAttribute("draggable", "true");

                // NOUVEAU: Prévenir le comportement par défaut (sélection de te
xte)
                // lors d'un Shift+clic pour garantir que le dragstart se déclen
che.
                // C'est la correction clé pour les tableaux et zones de texte.
                el.addEventListener('mousedown', function(e) {
                    if (e.shiftKey) {
                        e.preventDefault();
                    }
                });

                el.addEventListener('dragstart', function(e) {
                    // On ne démarre le glisser-déposer que si la touche Shift e
st maintenue
                    if (!e.shiftKey) {
                        e.preventDefault();
                        return;
                    }
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData('move-obj-oid', oid + "");
                    e.dataTransfer.setData('move-obj-page', idx + "");
                    el.classList.add('dragging');
                });

                el.addEventListener('dragend', function() {
                    el.classList.remove('dragging');
                });

                el.onclick = function(e) {
                    if (e.shiftKey) return; // Empêche la sélection si on a essa
yé de drag
                    selectedElement = { pageIdx: idx, objIdx: oid, type: obj.typ
e };
                    document.querySelectorAll('.selected').forEach(n => n.classL
ist.remove('selected'));
                    el.classList.add('selected');
                    e.stopPropagation();
                };

                if (selectedElement && selectedElement.pageIdx === idx && select
edElement.objIdx === oid)
                    el.classList.add('selected');

                objs.appendChild(el);
            }
        });
        content.appendChild(objs);
    }

    let pagin = document.createElement('div');
    pagin.className = "pagination";
    pagin.innerText = `Page ${idx+1} / ${pages.length}`;
    div.appendChild(content);
    div.appendChild(pagin);

    div.addEventListener('click', function() {
        selectedPage = idx;
        updateSelectionClass();
    });
    if (idx === selectedPage) div.classList.add('selected');
    return div;
}


function updateAllChapterNumbers() {
    let hCounters = [0, 0, 0, 0];
    pages.forEach((page, pageIdx) => {
        if (pageIdx >= 2 && Array.isArray(page.objects)) {
            page.objects.forEach(obj => {
                obj.calculatedPrefix = "";
                if (/^h[1-4]$/.test(obj.type)) {
                    const level = parseInt(obj.type[1]) - 1;
                    hCounters[level]++;
                    for (let k = level + 1; k < 4; k++) {
                        hCounters[k] = 0;
                    }
                    obj.calculatedPrefix = hCounters.slice(0, level + 1).join(".
") + ". ";
                }
            });
        }
    });

    if (pages.length > 1 && pages[1].type === 'toc') {
        for (let i = pages.length - 1; i > 1; i--) {
            if (pages[i].type === 'toc_continued') {
                pages.splice(i, 1);
                orientation.splice(i, 1);
            }
        }
    }

    renderDocument();

    if (pages.length > 1 && pages[1].type === 'toc') {
        let tocPaginationOccurred;
        let currentPageIndexForToc = 1;
        let safetyCounter = 0;
        const maxTocPages = pages.length + 10;

        do {
            tocPaginationOccurred = paginateToc(currentPageIndexForToc);
            if (tocPaginationOccurred) {
                currentPageIndexForToc++;
                renderDocument();
            }
            safetyCounter++;
            if (safetyCounter > maxTocPages) {
                console.error("[updateAllChapterNumbers] paginateToc loop safety
 break!");
                break;
            }
        } while (tocPaginationOccurred && currentPageIndexForToc < pages.length)
;
    }
}

function updateSelectionClass() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('se
lected'));
    let pagesList = document.querySelectorAll('.page');
    if (pagesList[selectedPage]) pagesList[selectedPage].classList.add('selected
');
    if (selectedElement) {
        if (selectedElement.pageIdx === 0 && selectedElement.objIdx === "mainTit
le") {
            let mainTitles = pagesList[0].querySelectorAll('.doc-title');
            if (mainTitles[1]) mainTitles[1].classList.add('selected');
        } else if (selectedElement.pageIdx >= 0 && pagesList[selectedElement.pag
eIdx]) {
            const pageContent = pagesList[selectedElement.pageIdx].querySelector
('.chapter-objects');
            if (pageContent) {
               const contentElements = Array.from(pageContent.children).filter(c
hild => child.draggable);
               if (contentElements[selectedElement.objIdx]) {
                    contentElements[selectedElement.objIdx].classList.add('selec
ted');
               }
            }
        }
    }
}

function deleteSelected() {
    if (!selectedElement) return;
    const { pageIdx, objIdx } = selectedElement;
    if (pageIdx >= 2 && typeof objIdx === "number") {
        let page = pages[pageIdx];
        if (Array.isArray(page.objects) && objIdx < page.objects.length) {
            page.objects.splice(objIdx, 1);
            selectedElement = null;
            renderDocument();
            paginatePage(pageIdx);
        }
    }
}

/* ------- Fonctions de mise en forme RTE -------- */
function formatDoc(cmd) { document.execCommand(cmd, false, null); }
function setColor(color) { document.execCommand("foreColor", false, color); }
function setFontSize(sz) {
    document.execCommand("fontSize", false, 7);
    let sel = window.getSelection();
    if (!sel.rangeCount) return;
    let el = sel.anchorNode.parentNode;
    el.style.fontSize = sz;
}

/* ------- Drag & drop pour objets outils ------- */
function setupDragNDrop() {
    document.querySelectorAll('#draggable-objects .draggable').forEach(el => {
        el.addEventListener('dragstart', evt => {
            evt.dataTransfer.setData("type", el.dataset.type);
        });
    });
}

/* ------- Ajout / suppression de pages -------- */
function addPage() {
    const newPageObject = { type: 'custom', objects: [] };
    pages.splice(selectedPage + 1, 0, newPageObject);
    orientation.splice(selectedPage + 1, 0, "portrait");
    selectedPage = selectedPage + 1;
    renderDocument();
    updateSelectionClass();
}

function deletePage() {
    if (selectedPage === 0 || selectedPage === 1) {
        alert("Impossible de supprimer la page de garde ou le sommaire !");
        return;
    }
    if (pages.length <= 2) {
        alert("Le document doit contenir au moins la page de garde et le sommair
e.");
        return;
    }

    const userConfirmed = window.confirm("Êtes-vous sûr de vouloir supprimer la
page " + (selectedPage + 1) + " ?\nCette action est irréversible.");

    if (userConfirmed) {
        pages.splice(selectedPage, 1);
        orientation.splice(selectedPage, 1);

        if (selectedPage >= pages.length) {
            selectedPage = pages.length - 1;
        }

        selectedElement = null;
        updateAllChapterNumbers();

        console.log("Page " + (selectedPage + 1) + " a été supprimée.");

    } else {
        console.log("Suppression de la page annulée par l'utilisateur.");
    }
}

/* ------- Changement d’orientation -------- */
function toggleOrientation(idx = null) {
    if (idx === null) idx = selectedPage;
    if (idx === 0 || idx === 1) {
        alert("Impossible de changer l’orientation de la page de garde ou du som
maire.");
        return;
    }
    orientation[idx] = (orientation[idx] === "portrait" ? "landscape" : "portrai
t");
    renderDocument();
    paginatePage(idx);
}

/* ------- Sauvegarder / Charger JSON ------- */
function saveJSON() {
    const data = JSON.stringify({ pages, orientation });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    a.download = "notice.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

function openJSONFile(input) {
    const file = input.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = evt => {
        try {
            let data = JSON.parse(evt.target.result);
            pages = data.pages || [];
            orientation = data.orientation || [];
            pages.forEach(p => {
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if ((obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.
type)) && obj.text && obj.originalText === undefined) {
                            obj.originalText = obj.text;
                        }
                        if ((obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.
type)) && !obj.id) {
                            obj.id = generateUniqueId();
                        }
                    });
                }
            });
            selectedPage = 0;
            selectedElement = null;
            updateAllChapterNumbers();
            paginateAllPages();
        } catch (e) {
            console.error("Error parsing JSON file:", e);
            alert("Erreur lors de l'ouverture du fichier JSON.");
        }
    };
    reader.readAsText(file);
    input.value = "";
}

function paginateAllPages() {
    setTimeout(() => {
        pages.forEach((page, idx) => {
            if (page.type === 'chapter' && idx >= 2) {
                paginateObjects(idx, false);
            }
        });
    }, 500);
}

function paginateToc(tocPageIndex) {
    if (tocPageIndex === 0 || tocPageIndex >= pages.length) return false;

    const tocPageData = pages[tocPageIndex];
    if (tocPageData.type !== 'toc' && tocPageData.type !== 'toc_continued') retu
rn false;

    const allPageDivs = document.querySelectorAll('#pages-container > .page');
    if (tocPageIndex >= allPageDivs.length) return false;

    const tocPageElement = allPageDivs[tocPageIndex];
    const tocOlElement = tocPageElement.querySelector('#table-of-contents');

    if (!tocOlElement || tocOlElement.children.length === 0) return false;

    const contentDiv = tocPageElement.querySelector('.content');
    const headerDiv = tocPageElement.querySelector('.header');
    const paginationDiv = tocPageElement.querySelector('.pagination');
    if (!contentDiv || !headerDiv || !paginationDiv) return false;

    const contentStyle = getComputedStyle(contentDiv);
    const pageHeight = tocPageElement.offsetHeight;
    const headerHeight = headerDiv.offsetHeight;
    const paginationHeight = paginationDiv.offsetHeight;
    const contentPaddingTop = parseFloat(contentStyle.paddingTop) || 0;
    const contentPaddingBottom = parseFloat(contentStyle.paddingBottom) || 0;
    const tocTitleElement = contentDiv.querySelector('h2');
    const tocTitleHeight = tocTitleElement ? tocTitleElement.offsetHeight + (par
seFloat(getComputedStyle(tocTitleElement).marginBottom) || 0) : 0;
    const availableHeightForOl = pageHeight - headerHeight - contentPaddingTop -
 contentPaddingBottom - paginationHeight - tocTitleHeight - 20;

    let accumulatedHeight = 0;
    let splitAtLiIndex = -1;
    const liItems = Array.from(tocOlElement.children).filter(child => child.tagN
ame === 'LI');

    for (let i = 0; i < liItems.length; i++) {
        const li = liItems[i];
        const liStyle = getComputedStyle(li);
        const totalLiHeight = li.offsetHeight + (parseFloat(liStyle.marginTop) |
| 0) + (parseFloat(liStyle.marginBottom) || 0);

        if (accumulatedHeight + totalLiHeight > availableHeightForOl) {
            splitAtLiIndex = (i > 0) ? i : (liItems.length > 1 ? 0 : -1);
            break;
        }
        accumulatedHeight += totalLiHeight;
    }

    if (splitAtLiIndex > -1) {
        const nodesToMove = liItems.slice(splitAtLiIndex);
        let nextPageIdx = tocPageIndex + 1;
        const newPageTocContinued = { type: 'toc_continued', tocItemsToRender: n
odesToMove.map(node => node.cloneNode(true)) };

        pages.splice(nextPageIdx, 0, newPageTocContinued);
        orientation.splice(nextPageIdx, 0, orientation[tocPageIndex]);

        nodesToMove.forEach(node => tocOlElement.removeChild(node));
        return true;
    }

    return false;
}

/* ------- Gestion des Risques Sélectionnés ------- */
function appliquerRisquesSelectionnes() {
    if (typeof ALL_RISKS === 'undefined' || !Array.isArray(ALL_RISKS)) {
        console.error("ALL_RISKS n'est pas défini ou n'est pas un tableau. Assur
ez-vous que constante.js est chargé et correct.");
        alert("Erreur : Les définitions des risques ne sont pas chargées ou sont
 incorrectes.");
        return;
    }

    let contentAddedOverall = false;

    ALL_RISKS.forEach(risque => {
        if (!risque || !risque.id || !risque.chapitreTargetName || !risque.titre
Type || !/^h[1-4]$/.test(risque.titreType)) {
            console.warn("Objet risque malformé ou type de titre de risque inval
ide dans ALL_RISKS:", risque);
            return;
        }

        const checkbox = document.getElementById(risque.id);
        if (!checkbox || !checkbox.checked) return;

        const niveauTitreRisque = parseInt(risque.titreType.substring(1));
        if (niveauTitreRisque <= 1) {
            alert(`Le risque "${risque.titreText}" (${risque.titreType}) ne peut
 pas être automatiquement placé car il est de niveau H1.`);
            return;
        }

        const parentTitreType = "h" + (niveauTitreRisque - 1);
        let parentFound = false;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (page.objects && Array.isArray(page.objects)) {
                for (let j = 0; j < page.objects.length; j++) {
                    const currentObj = page.objects[j];
                    if (currentObj.type === parentTitreType && (currentObj.origi
nalText || currentObj.text || "").trim().toLowerCase() === risque.chapitreTarget
Name.trim().toLowerCase()) {

                        let alreadyExists = false;
                        if (j + 1 < page.objects.length) {
                            const nextObj = page.objects[j + 1];
                            if (nextObj.type === risque.titreType && (nextObj.te
xt === risque.titreText || nextObj.originalText === risque.titreText)) {
                                alreadyExists = true;
                            }
                        }

                        if (!alreadyExists) {
                            const newTitleObj = { type: risque.titreType, text:
risque.titreText, originalText: risque.titreText, id: generateUniqueId() };
                            const newContentObj = { type: "text", html: risque.c
ontenuHTML };
                            page.objects.splice(j + 1, 0, newTitleObj, newConten
tObj);
                            contentAddedOverall = true;
                        }
                        parentFound = true; // On considère le parent traité, m
ême si le contenu existait déjà
                        break;
                    }
                }
            }
            if (parentFound) break;
        }

        if (!parentFound) {
            alert(`Le titre parent "${risque.chapitreTargetName}" (type ${parent
TitreType}) n'a pas été trouvé pour le risque "${risque.titreText}".`);
        }
    });

    if (contentAddedOverall) {
        updateAllChapterNumbers();
        alert("Les nouveaux risques sélectionnés ont été appliqués aux sections
correspondantes.");
    } else {
        alert("Aucun nouveau risque à ajouter, ou les sections parentes n'ont pa
s été trouvées ou le contenu existait déjà.");
    }
}

// --- Fonctions de Menu Tableau et de Pagination (existantes) ---
function showTableMenu(e, obj, rowIdx, colIdx) {
    let cellData = obj.rows[rowIdx][colIdx];
    if (cellData === null) return;
    let oldMenu = document.getElementById('table-menu-popup');
    if (oldMenu) oldMenu.remove();
    let menu = document.createElement('div');
    menu.id = "table-menu-popup";
    Object.assign(menu.style, {
        position: "fixed", top: e.clientY + "px", left: e.clientX + "px",
        background: "#fff", border: "1px solid #999", borderRadius: "8px",
        zIndex: 10000, boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        fontSize: "1em", padding: "4px 0"
    });
    menu._originTable = e.currentTarget.closest('.table-container').querySelecto
r('table');
    function alignItem(label, align) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, { padding:"6px 18px", cursor:"pointer" });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            let c = obj.rows[rowIdx][colIdx];
            if (typeof c === "object") c.align = align;
            else obj.rows[rowIdx][colIdx] = { text: c, align };
            const td = menu._originTable.rows[rowIdx].cells[colIdx];
            td.style.textAlign = align;
            // restoreCaret(); // Cette fonction n'est pas définie, commenter po
ur l'instant
            menu.remove();
        };
        menu.appendChild(item);
    }
    alignItem("Aligner à gauche", "left");
    alignItem("Centrer horizontalement", "center");
    function structuralItem(label, fn) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, { padding:"6px 18px", cursor:"pointer" });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            fn();
            menu.remove();
            renderDocument();
        };
        return item;
    }
    function menuItem(label, fn) {
        let item = document.createElement('div');
        item.innerText = label;
        item.style.padding = "6px 18px"; item.style.cursor  = "pointer";
        item.onmouseover  = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => { fn(); menu.remove(); renderDocument(); };
        return item;
    }
    menu.appendChild(menuItem(obj.headerShaded ? "Désactiver gris de la 1ʳᵉ lign
e" : "Griser la 1ʳᵉ ligne", () => {
        obj.headerShaded = !obj.headerShaded;
    }));
    menu.appendChild(document.createElement('hr'));
    menu.appendChild(structuralItem("Ajouter colonne à droite", () => {
        obj.rows.forEach(row => row.splice(colIdx + 1, 0, ""));
        const w = obj.colWidths[colIdx]; // Problème potentiel si colIdx est la
dernière
        obj.colWidths.splice(colIdx + 1, 0, w); // Duplique la largeur, normalis
ation nécessaire après
        normalizeColWidths(obj); // Appel à la normalisation
        }));
    menu.appendChild(structuralItem("Ajouter ligne dessous", () => {
        let newRow = obj.rows[0].map(() => "");
        obj.rows.splice(rowIdx + 1, 0, newRow);
        }));
   if (obj.rows[0].length > 1) {
        menu.appendChild(structuralItem("Supprimer colonne", () => {
            for (let r = 0; r < obj.rows.length; r++) {
                let cd = obj.rows[r][colIdx];
                if (cd === null) {
                    for (let k = colIdx - 1; k >= 0; k--) {
                        let lc = obj.rows[r][k];
                        if (typeof lc === "object" && lc.colspan > 1) {
                            lc.colspan--;
                            obj.rows[r][colIdx] = "";
                            break;
                        }
                    }
                }
                else if (typeof cd === "object" && cd.colspan > 1) {
                    let text = cd.text || "";
                    obj.rows[r][colIdx] = text;
                    for (let k = 1; k < cd.colspan; k++) {
                        if (obj.rows[r][colIdx + k] !== undefined) obj.rows[r][c
olIdx + k] = "";
                    }
                }
            }
            obj.rows.forEach(row => row.splice(colIdx, 1));
            obj.colWidths.splice(colIdx, 1); // Supprimer aussi la largeur de co
lonne
            normalizeColWidths(obj); // Appel à la normalisation
        }));
    }
    if (obj.rows.length > 1) {
        menu.appendChild(structuralItem("Supprimer ligne", () => {
            obj.rows.splice(rowIdx, 1);
        }));
    }
    if (colIdx < obj.rows[rowIdx].length - 1 && obj.rows[rowIdx][colIdx+1] !== n
ull) { // S'assurer qu'il y a une cellule à droite et qu'elle n'est pas déjà par
tie d'une fusion
        menu.appendChild(structuralItem("Fusionner à droite", () => {
            let cur = obj.rows[rowIdx][colIdx];
            let next = obj.rows[rowIdx][colIdx + 1];
            let currentText = (typeof cur === "object" && !cur.image) ? cur.text
 : (cur || "");
            let nextText = (typeof next === "object" && !next.image) ? next.text
 : (next || "");
            let newColspan = ((typeof cur === "object" && cur.colspan) ? cur.col
span : 1) +
                             ((typeof next === "object" && next.colspan) ? next.
colspan : 1);

            obj.rows[rowIdx][colIdx] = {
                text: currentText + " " + nextText,
                colspan: newColspan,
                align: (typeof cur === "object" ? cur.align : "left") // Conserv
er l'alignement de la cellule de gauche
            };
            // Marquer les cellules suivantes comme null pour la fusion
            for(let k=1; k < newColspan; k++){
                if(colIdx + k < obj.rows[rowIdx].length) {
                     obj.rows[rowIdx][colIdx+k] = null;
                }
            }
            // Recalculer proprement les indices pour splice si d'autres fusions
 existent
            let cellsToRemove = ((typeof next === "object" && next.colspan) ? ne
xt.colspan : 1);
            obj.rows[rowIdx].splice(colIdx + 1, cellsToRemove);


        }));
    }
    if (typeof cellData === "object" && cellData.colspan > 1) {
        menu.appendChild(structuralItem("Scinder cellule", () => {
            let n = cellData.colspan;
            let currentText = cellData.text || "";
            // Diviser le texte approximativement si possible (simpliste)
            let partText = currentText.substring(0, Math.ceil(currentText.length
 / n));
            obj.rows[rowIdx][colIdx] = {text: partText, align: cellData.align};
// Remettre la première partie

            for (let i = 1; i < n; i++) {
                 // Insérer des cellules vides pour les parties scindées
                obj.rows[rowIdx].splice(colIdx + i, 0, {text: "", align: cellDat
a.align});
            }
        }));
    }
    document.body.appendChild(menu);
    document.addEventListener('mousedown', function hideMenu(ev) {
        if (menu && !menu.contains(ev.target)) { // Vérifier si menu existe enco
re
            menu.remove();
            document.removeEventListener('mousedown', hideMenu);
        }
    }, { once: false }); // {once: true} peut être problématique si le menu est
recréé rapidement
}

function exportCleanHTML() {
    let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Export Notice</title>
    <style>
        body {
            background: #fff;
            font-family: 'Segoe UI', 'Arial', sans-serif; /* Police du mode édit
ion */
            font-size: 12pt;
            margin: 0;
            padding: 0;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            max-width: 210mm;
            max-height: 297mm;
            box-sizing: border-box !important;
            box-shadow: none !important;
                        border: 1px solid #555 !important;
            border-radius: 3px !important;
            margin: 0 auto 10mm auto !important; /* Marge en bas pour séparation
 visuelle, auto pour centrer */
            padding: 10mm 15mm 10mm 15mm !important; /* Marges A4 approx (H, D,
B, G) */
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            page-break-after: always !important;
        }
        .page:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
        }
        .page.landscape {
            width: 297mm !important;
            min-height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
        }
        .header {
            background: #fff !important;
            border-bottom: 1px solid #000 !important;
            padding: 0 0 10px 0 !important;
            height: auto !important;
            box-sizing: border-box !important;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
        }
        .header .logo {
            height: 60px; /* Conserver une taille fixe ou la rendre relative si
possible */
            width: 60px;
            object-fit: contain;
        }
        .header .doc-title {
            flex: 1;
            margin: 0 18px;
            font-size: 24pt !important;
            font-weight: bold;
            text-align: center;
            color: #000 !important;
        }
        .header .revision {
            min-width: 60px;
            text-align: right;
            font-size: 12pt; /* Ajusté pour être cohérent */
            color: #000 !important;
        }
        .header .revision .index, .header .revision .num {
             color: #000 !important;
        }
        .page .content {
            flex-grow: 1 !important;
            padding: 10px 0 0 0 !important;
            overflow: hidden !important;
            gap: 12px !important;
            box-sizing: border-box !important;
            width: 100% !important;
            display: flex; /* Ajouté pour que les éléments enfants puissent être
 gérés */
            flex-direction: column; /* Les objets sont empilés verticalement */
            align-items: normal; /* Ou 'stretch' selon le besoin */
        }
        .page .pagination {
            display: block !important;
            position: absolute !important;
            bottom: 5mm !important;
            left: 15mm !important;
            right: 15mm !important;
            text-align: right !important; /* Modifié pour aligner à droite comme
 demandé précédemment */
            font-size: 10pt !important;
            color: #000 !important;
            width: auto !important;
        }
        .page .img-drop { /* Pour la page de garde si une image y est présente *
/
            border: none !important;
            min-height: 10cm; /* Hauteur indicative, sera remplie par l'image */
            max-height: 15cm;
            width: 100%;
            background: #fff !important;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 20px auto; /* Centrer le bloc image */
        }
        .page .img-drop img {
            max-width: 100% !important;
            max-height: 100% !important;
            height: auto !important;
            object-fit: contain;
        }
        .rte-area { /* Styles pour les zones de texte enrichi */
            background: #fff !important;
            border: none !important;
            min-height: auto; /* Laisser le contenu déterminer la hauteur */
            padding: 0; /* Le padding est déjà géré par .page ou .content */
        }
        .page-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important; /* ou auto si le contenu doit dicter
 la largeur */
            margin: 10px 0;
        }
        .page-table th, .page-table td {
            border: 1px solid #000 !important;
            padding: 5px 8px; /* Ajuster le padding des cellules */
            word-break: break-word;
            vertical-align: middle;
            text-align: left;
        }
        .page-table th {
            background: #eee !important;
            font-weight: bold;
        }
        .page .chapter-title, .page h1, .page h2, .page h3, .page h4 { /* Styles
 pour les titres */
            color: #000 !important;
            font-weight: bold;
            margin: 20px 0 10px 0;
        }
        .page h1, .page .h1 { font-size: 18pt !important; }
        .page h2, .page .h2 { font-size: 16pt !important; }
        .page h3, .page .h3 { font-size: 14pt !important; }
        .page h4, .page .h4 { font-size: 13pt !important; }

        /* Styles spécifiques pour la page de garde (idx === 0) */
        .cover-title {
            font-size: 30pt;
            text-align: center;
            margin: 40px 0; /* Espacement pour le titre de la page de garde */
        }
        /* Styles pour le sommaire (idx === 1) */
        #table-of-contents {
            list-style-type: none;
            padding-left: 0; /* Pas de padding par défaut pour ol */
            font-size: 1.1em; /* Un peu plus grand pour le sommaire */
        }
        #table-of-contents li {
            margin-bottom: 2px; /* Espacement entre les items du sommaire */
        }
    </style>
</head>
<body>
`;
    pages.forEach((pageData, idx) => {
        const pageOrientation = orientation[idx] || 'portrait';
        html += `<div class="page ${pageOrientation === 'landscape' ? 'landscape
' : ''}">`;
        html += `<div class="header"><img class="logo" src="${(typeof logoData !
== "undefined" && logoData.url) ? logoData.url : ''}" alt="Logo"><div class="doc
-title">${pages[0].docTitle || "Titre du document"}</div><div class="revision"><
div class="index">${INDEX_REV}</div><div class="num">${pages[0].editableNum || N
UM_REF}</div></div></div>`;
        html += `<div class="content">`;
        if (idx === 0) {
            html += `<div class="cover-title">${pageData.title || "Notice"}</div
>`;
            if (pageData.img) {
                html += `<div class="img-drop"><img src="${pageData.img}" alt="I
mage de couverture"></div>`;
            }
            // Ajout du bloc constructeur pour l'export aussi
            html += `<div class="constructeur-info" style="border: 2px solid #00
0; padding: 10px; margin-top: 20px; font-size: 12pt; text-align: left;"><b>Const
ructeur : APA <br>Adresse :</b> 292 Rue de l'Epinette, 76320 CAUDEBEC Lès ELBEUF
 <br>☎️ +33 2.32.96.26.60</div>`;

        } else if (idx === 1) {
            html += `<h2>Sommaire</h2>`;
            html += `<ol id="table-of-contents">`;
            for (let i = 2; i < pages.length; i++) {
                const p = pages[i];
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if (/^h[1-4]$/.test(obj.type) && (obj.originalText || ob
j.text) && obj.id) {
                            const prefix = obj.calculatedPrefix || "";
                            const textValue = obj.originalText || obj.text || ""
;
                            const level = parseInt(obj.type[1]);
                            const pageNumberOfTitleExport = i + 1;
                            const anchorId = `export-title-${obj.id}`;
                            html += `<li style="margin-left: ${(level - 1) * 20}
px;"><a href="#${anchorId}"><span class="toc-title">${prefix}${textValue}</span>
<span class="toc-page-num">${pageNumberOfTitleExport}</span></a></li>`;
                        }
                    });
                }
            }
            html += `</ol>`;
        } else {
            if (Array.isArray(pageData.objects)) {
                pageData.objects.forEach(obj => {
                    if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)
) {
                        const prefix = obj.calculatedPrefix || "";
                        const text = obj.originalText || obj.text || "";
                        const anchorId = obj.id ? `export-title-${obj.id}` : '';
                        html += `<div class="${obj.type}" ${anchorId ? `id="${an
chorId}"` : ''}>${prefix}${text}</div>`;
                    } else if (obj.type === "text") {
                        html += `<div class="rte-area">${obj.html || ""}</div>`;
                    } else if (obj.type === "table") {
                        let tableStyle = 'width:100%;';
                        html += `<table class="page-table" style="${tableStyle}"
>`;
                        if (obj.colWidths && Array.isArray(obj.colWidths) && obj
.colWidths.length > 0) {
                            html += `<colgroup>`;
                            let totalWidthDefined = obj.colWidths.reduce((sum, w
) => sum + parseFloat(w || 0), 0);
                            if (totalWidthDefined > 0) {
                                obj.colWidths.forEach(widthPx => {
                                    const percent = (parseFloat(widthPx || 0) /
totalWidthDefined) * 100;
                                    html += `<col style="width: ${percent.toFixe
d(2)}%;">`;
                                });
                            } else { // Fallback if widths are not properly defi
ned
                                const equalPercent = 100 / obj.colWidths.length;
                                obj.colWidths.forEach(() => html += `<col style=
"width: ${equalPercent.toFixed(2)}%;">`);
                            }
                            html += `</colgroup>`;
                        }
                        if (Array.isArray(obj.rows)) {
                            obj.rows.forEach((row, rowIndex) => {
                                html += `<tr>`;
                                if (Array.isArray(row)) {
                                    row.forEach(cell => {
                                        if (cell === null) return;
                                        const cellTag = (rowIndex === 0 && obj.h
eaderShaded) ? 'th' : 'td';
                                        let cellContent = '';
                                        let colspan = 1;
                                        let textAlign = 'left';
                                        if (typeof cell === "object" && cell !==
 null) {
                                            if (cell.image) {
                                                cellContent = `<img src="${cell.
image}" style="max-width:100%; height:auto; display:block;">`;
                                            } else {
                                                cellContent = cell.text || "";
                                            }
                                            colspan = cell.colspan || 1;
                                            textAlign = cell.align || 'left';
                                        } else {
                                            cellContent = cell || "";
                                        }
                                        html += `<${cellTag} colspan="${colspan}
" style="text-align:${textAlign};">${cellContent}</${cellTag}>`;
                                    });
                                }
                                html += `</tr>`;
                            });
                        }
                        html += `</table>`;
                    }
                });
            }
        }
        html += `</div>`;
        html += `<div class="pagination">Page ${idx + 1} / ${pages.length}</div>
`;
        html += `</div>`;
    });
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notice_export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// Nouvelle fonction paginateObjects
function paginateObjects(idx, isRecursiveCall = false) {
    // On exclut la page de garde (idx === 0) et les index hors limites.
    // La page du Sommaire (idx === 1) sera maintenant traitée.
    if (idx === 0 || idx >= pages.length) {
        if (!isRecursiveCall) console.log(`paginateObjects: Page ${idx} non élig
ible pour pagination (couverture ou hors limites).`);
        return;
    }

    setTimeout(() => {
        const allPageDivs = document.querySelectorAll('#pages-container > .page'
);
        if (idx >= allPageDivs.length) {
            console.warn(`paginateObjects: Index ${idx} hors limites pour les di
vs de page rendues (longueur ${allPageDivs.length}). Probablement besoin d'un re
nderDocument() avant cet appel.`);
            return;
        }

        const currentPageData = pages[idx];
        const thisPageDiv = allPageDivs[idx];

        // Déterminer si c'est une page de sommaire ou une page de chapitre stan
dard
        const isTocPage = (currentPageData.type === 'toc' || currentPageData.typ
e === 'toc_continued');
        let itemsToPaginate = []; // Les éléments réels à mesurer et potentielle
ment déplacer (DOM nodes)
        let sourceDataArray = null; // Le tableau de données source (ex: page.ob
jects) - pertinent pour les chapitres
        let itemContainerDiv = null; // Le conteneur DOM des items (ex: .chapter
-objects ou #table-of-contents)

        if (!thisPageDiv || !currentPageData) {
            console.warn(`[Page ${idx}] Données de page ou div de page manquante
s.`);
            return;
        }

        if (isTocPage) {
            itemContainerDiv = thisPageDiv.querySelector('#table-of-contents');
            if (!itemContainerDiv) {
                // Si la page TOC est vide (par ex. une toc_continued fraîchemen
t créée), elle n'aura pas encore de #table-of-contents.
                // C'est normal, la pagination ne trouvera rien à faire.
                console.log(`[Page TOC ${idx}] Conteneur #table-of-contents non
trouvé (peut être normal si vide).`);
                // On ne quitte pas, car il se peut qu'on y déplace des items pl
us tard.
            } else {
                 itemsToPaginate = Array.from(itemContainerDiv.children).filter(
child => child.tagName === 'LI');
            }
            console.log(`[Page TOC ${idx}] Mode pagination pour Sommaire. ${item
sToPaginate.length} <li> trouvés.`);
            // Pour le TOC, sourceDataArray n'est pas utilisé de la même manière
 (on déplace les noeuds LI directement)
        } else if (currentPageData.type === 'chapter') {
            itemContainerDiv = thisPageDiv.querySelector('.chapter-objects');
            if (!itemContainerDiv) {
                console.warn(`[Page Chapitre ${idx}] .chapter-objects manquant.`
);
                return;
            }
            // Pour les chapitres, itemsToPaginate sont les éléments rendus, pas
 les drop-targets
            itemsToPaginate = Array.from(itemContainerDiv.children)
                                         .filter(child => child.offsetParent !==
 null && !child.classList.contains('drop-target'));
            sourceDataArray = currentPageData.objects; // Le tableau d'objets de
 la page
            if (sourceDataArray && sourceDataArray.length !== itemsToPaginate.le
ngth) {
                 console.warn(`[Page Chapitre ${idx}] Incohérence: ${sourceDataA
rray.length} objets de données vs ${itemsToPaginate.length} éléments rendus.`);
            }
            console.log(`[Page Chapitre ${idx}] Mode pagination pour Chapitre. $
{itemsToPaginate.length} objets rendus trouvés.`);
        } else {
            console.log(`[Page ${idx}] Type de page "${currentPageData.type}" no
n géré pour la pagination.`);
            return;
        }

        const contentDiv = thisPageDiv.querySelector('.content');
        if (!contentDiv) { // contentDiv est nécessaire pour les calculs de haut
eur
            console.warn(`[Page ${idx}] div.content manquant.`);
            return;
        }
        // chapterObjsDiv n'est pertinent que pour les pages 'chapter', itemCont
ainerDiv est maintenant plus générique.
        // const chapterObjsDiv = thisPageDiv.querySelector('.chapter-objects');


        const pageStyle = getComputedStyle(thisPageDiv);
        const contentStyle = getComputedStyle(contentDiv);
        const headerDiv = thisPageDiv.querySelector('.header');
        const paginationDiv = thisPageDiv.querySelector('.pagination');

        const pageHeight = thisPageDiv.offsetHeight;
        const headerHeight = headerDiv ? headerDiv.offsetHeight : 0;
        const paginationHeight = paginationDiv ? paginationDiv.offsetHeight : 0;

        const contentPaddingTop = parseFloat(contentStyle.paddingTop) || 0;
        const contentPaddingBottom = parseFloat(contentStyle.paddingBottom) || 0
;

        const grossContentHeight = pageHeight - headerHeight;
        // Marge de 10px pour la pagination (qui est en absolute) et 10px de séc
urité en plus.
        const availableHeightForChapterObjects = grossContentHeight - contentPad
dingTop - contentPaddingBottom - paginationHeight - 20;

        console.log(`[Page ${idx}] PageH: ${pageHeight.toFixed(2)}, HeaderH: ${h
eaderHeight.toFixed(2)}, ContentPadT: ${contentPaddingTop.toFixed(2)}, ContentPa
dB: ${contentPaddingBottom.toFixed(2)}, PaginationH: ${paginationHeight.toFixed(
2)}, AvailableHForChapterObjects: ${availableHeightForChapterObjects.toFixed(2)}
`);

        let accumulatedHeight = 0;
        let splitAtIndex = -1;

        for (let i = 0; i < itemsToPaginate.length; i++) {
            const element = itemsToPaginate[i];
            const elementHeight = element.offsetHeight;
            const elementStyle = getComputedStyle(element);
            const marginTop = parseFloat(elementStyle.marginTop) || 0;
            const marginBottom = parseFloat(elementStyle.marginBottom) || 0;

            let gap = 0;
            if (itemContainerDiv && i > 0) {
                const gapProperty = getComputedStyle(itemContainerDiv).gap;
                if (gapProperty !== 'normal') {
                    gap = parseFloat(gapProperty) || 0;
                }
            }
            const totalElementHeightWithMarginsAndGap = elementHeight + marginTo
p + marginBottom + gap;

            if (accumulatedHeight + totalElementHeightWithMarginsAndGap > availa
bleHeightForChapterObjects) {
                if (i === 0) {
                     if (itemsToPaginate.length > 1 || !isRecursiveCall) {
                        splitAtIndex = 0;
                    } else {
                        splitAtIndex = -1;
                    }
                } else {
                    splitAtIndex = i;
                }
                break;
            }
            accumulatedHeight += totalElementHeightWithMarginsAndGap;
        }

        console.log(`[Page ${idx}] Fin boucle. AccumulatedHeight: ${accumulatedH
eight.toFixed(2)}, splitAtIndex: ${splitAtIndex}`);

        const itemCount = itemsToPaginate.length;

        if (splitAtIndex > -1 && splitAtIndex < itemCount) {
            if (currentPageData.type === 'chapter') {
                if (!sourceDataArray) {
                    console.error(`[Page Chapitre ${idx}] sourceDataArray est nu
ll!`);
                    return;
                }
                if (sourceDataArray.length === 1 && splitAtIndex === 0 && isRecu
rsiveCall) {
                    console.warn(`[Page Chapitre ${idx}] Tentative de déplacemen
t du seul objet (appel récursif). Annulation pour éviter boucle.`);
                } else if (sourceDataArray.length === 0 && itemsToPaginate.lengt
h > 0 && splitAtIndex === 0){
                     console.warn(`[Page Chapitre ${idx}] Incohérence: sourceDat
aArray vide mais itemsToPaginate non. SplitAtIndex 0. Annulation.`);
                }
                else {
                    let objectsToMove = sourceDataArray.slice(splitAtIndex);
                    pages[idx].objects = sourceDataArray.slice(0, splitAtIndex);


                    let nextPageIdx = idx + 1;
                    let nextPageData = pages[nextPageIdx];

                    if (!nextPageData || nextPageData.type !== 'chapter') {
                        console.log(`[Page Chapitre ${idx}] Création page (type
chapter) après ${idx}.`);
                        const newPageTemplate = { type: 'chapter', objects: [] }
;
                        pages.splice(nextPageIdx, 0, newPageTemplate);
                        orientation.splice(nextPageIdx, 0, orientation[idx]);
                        nextPageData = newPageTemplate;
                    }

                    nextPageData.objects = objectsToMove.concat(nextPageData.obj
ects || []);
                    console.log(`[Page Chapitre ${idx}] ${objectsToMove.length}
objets déplacés vers page ${nextPageIdx}.`);

                    updateAllChapterNumbers();
                    console.log(`[Page Chapitre ${idx}] Pagination OK. Appel réc
ursif pour page ${nextPageIdx}.`);
                    paginateObjects(nextPageIdx, true);
                }
            }
        } else {
             console.log(`[Page ${idx}] Aucune pagination nécessaire (splitAtInd
ex: ${splitAtIndex}, itemCount: ${itemCount}).`);
        }
    }, 250);
}

// La fonction paginatePage est un alias.
function paginatePage(idx) {
    paginateObjects(idx, false); // false indique que ce n'est pas un appel récu
rsif interne.
}
