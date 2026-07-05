/* ============================================================
   Markdown Editor — Main Logic
   منظم في وحدات: i18n / Theme / Direction / Editor / File / View
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   1) الترجمة i18n — نصوص الواجهة بالعربية والإنجليزية
------------------------------------------------------------ */
const I18N = {
    ar: {
        appTitle: 'محرر ماركداون',
        open: 'فتح', save: 'حفظ', clear: 'تفريغ',
        openFile: 'فتح ملف من جهازك',
        saveFile: 'حفظ / تحميل الملف بصيغة .md',
        clearContent: 'تفريغ المحتوى',
        editorOnly: 'المحرر فقط',
        splitView: 'عرض مقسوم (محرر + معاينة)',
        previewOnly: 'المعاينة فقط',
        toggleDirection: 'تبديل اتجاه النص (RTL / LTR)',
        toggleLang: 'Switch UI to English',
        toggleTheme: 'الوضع الليلي / النهاري',
        editor: 'المحرر', preview: 'المعاينة',
        words: 'كلمات', chars: 'أحرف', lines: 'أسطر',
        dropHere: 'أفلت ملف Markdown هنا',
        editorPlaceholder: 'اكتب نص Markdown هنا… أو افتح ملفاً من جهازك، أو اسحب الملف وأفلته في النافذة',
        confirmClear: 'هل أنت متأكد من تفريغ المحتوى؟ سيتم فقدان التعديلات غير المحفوظة.',
        cleared: 'تم تفريغ المحتوى',
        fileLoaded: 'تم فتح الملف: ',
        fileSaved: 'تم تحميل الملف بنجاح',
        emptyNothingToSave: 'لا يوجد محتوى للحفظ',
        invalidFile: 'الرجاء اختيار ملف بصيغة .md أو .markdown أو .txt',
        unsaved: 'تعديلات غير محفوظة',
        htmlLang: 'ar',
    },
    en: {
        appTitle: 'Markdown Editor',
        open: 'Open', save: 'Save', clear: 'Clear',
        openFile: 'Open a file from your device',
        saveFile: 'Save / download file as .md',
        clearContent: 'Clear content',
        editorOnly: 'Editor only',
        splitView: 'Split view (editor + preview)',
        previewOnly: 'Preview only',
        toggleDirection: 'Toggle text direction (RTL / LTR)',
        toggleLang: 'تبديل الواجهة إلى العربية',
        toggleTheme: 'Dark / light mode',
        editor: 'Editor', preview: 'Preview',
        words: 'Words', chars: 'Chars', lines: 'Lines',
        dropHere: 'Drop your Markdown file here',
        editorPlaceholder: 'Write Markdown here… or open a file from your device, or drag & drop it into the window',
        confirmClear: 'Are you sure you want to clear the content? Unsaved changes will be lost.',
        cleared: 'Content cleared',
        fileLoaded: 'File opened: ',
        fileSaved: 'File downloaded successfully',
        emptyNothingToSave: 'Nothing to save',
        invalidFile: 'Please choose a .md, .markdown or .txt file',
        unsaved: 'Unsaved changes',
        htmlLang: 'en',
    },
};

/* ------------------------------------------------------------
   2) الحالة العامة للتطبيق + عناصر DOM
------------------------------------------------------------ */
const state = {
    lang: localStorage.getItem('md.lang') || 'ar',        // لغة الواجهة
    dir: localStorage.getItem('md.dir') || 'rtl',         // اتجاه النص
    theme: localStorage.getItem('md.theme') || 'light',   // المظهر
    view: localStorage.getItem('md.view') || 'split',     // وضع العرض
    fileName: 'untitled.md',
    dirty: false,                                         // تعديلات غير محفوظة
};

const el = {
    html: document.documentElement,
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    workspace: document.getElementById('workspace'),
    fileInput: document.getElementById('file-input'),
    fileName: document.getElementById('file-name'),
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    btnClear: document.getElementById('btn-clear'),
    btnDirection: document.getElementById('btn-direction'),
    btnLang: document.getElementById('btn-lang'),
    btnTheme: document.getElementById('btn-theme'),
    themeIcon: document.getElementById('theme-icon'),
    dirLabel: document.getElementById('dir-label'),
    langLabel: document.getElementById('lang-label'),
    viewBtns: document.querySelectorAll('.view-btn'),
    wordCount: document.getElementById('word-count'),
    charCount: document.getElementById('char-count'),
    lineCount: document.getElementById('line-count'),
    saveStatus: document.getElementById('save-status'),
    dropOverlay: document.getElementById('drop-overlay'),
    toast: document.getElementById('toast'),
    hljsLight: document.getElementById('hljs-theme-light'),
    hljsDark: document.getElementById('hljs-theme-dark'),
};

const t = (key) => I18N[state.lang][key] || key;

/* ------------------------------------------------------------
   3) إعداد مكتبة marked + التمييز اللوني للأكواد
------------------------------------------------------------ */
marked.setOptions({
    gfm: true,            // دعم الجداول وقوائم المهام (GitHub Flavored)
    breaks: true,         // سطر جديد = <br>
});
// ملاحظة: التمييز اللوني يتم بعد الإدراج عبر hljs.highlightElement في renderPreview

/* ------------------------------------------------------------
   4) المعاينة المباشرة Live Preview
------------------------------------------------------------ */
function renderPreview() {
    const raw = el.editor.value;
    // تحويل Markdown إلى HTML ثم تعقيمه لمنع XSS
    const html = DOMPurify.sanitize(marked.parse(raw));
    el.preview.innerHTML = html;

    // تمييز الأكواد بعد الإدراج
    el.preview.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    updateStats(raw);
}

// Debounce لتحسين الأداء أثناء الكتابة السريعة
let renderTimer = null;
function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 120);
}

function updateStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    el.wordCount.textContent = words;
    el.charCount.textContent = text.length;
    el.lineCount.textContent = text ? text.split('\n').length : 0;
}

function markDirty(isDirty) {
    state.dirty = isDirty;
    el.saveStatus.textContent = isDirty ? '● ' + t('unsaved') : '';
    el.saveStatus.style.color = isDirty ? 'var(--danger)' : 'var(--success)';
}

/* ------------------------------------------------------------
   5) التعامل مع الملفات: فتح / حفظ / تفريغ / سحب وإفلات
------------------------------------------------------------ */
function isMarkdownFile(file) {
    return /\.(md|markdown|txt)$/i.test(file.name);
}

function openFile(file) {
    if (!isMarkdownFile(file)) {
        showToast(t('invalidFile'));
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        el.editor.value = e.target.result;
        state.fileName = file.name;
        el.fileName.textContent = file.name;
        renderPreview();
        markDirty(false);
        showToast(t('fileLoaded') + file.name);
    };
    reader.readAsText(file, 'UTF-8');
}

function saveFile() {
    const content = el.editor.value;
    if (!content.trim()) {
        showToast(t('emptyNothingToSave'));
        return;
    }
    // BOM اختياري غير مضاف — UTF-8 قياسي يدعم العربية تماماً
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.fileName.endsWith('.md') ? state.fileName : state.fileName + '.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    markDirty(false);
    showToast(t('fileSaved'));
}

function clearContent() {
    if (el.editor.value && !confirm(t('confirmClear'))) return;
    el.editor.value = '';
    state.fileName = 'untitled.md';
    el.fileName.textContent = state.fileName;
    renderPreview();
    markDirty(false);
    showToast(t('cleared'));
}

/* سحب وإفلات الملفات */
function setupDragAndDrop() {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        el.dropOverlay.hidden = false;
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            el.dropOverlay.hidden = true;
        }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        el.dropOverlay.hidden = true;
        const file = e.dataTransfer.files[0];
        if (file) openFile(file);
    });
}

/* ------------------------------------------------------------
   6) وضع العرض: محرر / مقسوم / معاينة
------------------------------------------------------------ */
function setView(view) {
    state.view = view;
    localStorage.setItem('md.view', view);
    el.workspace.className = 'workspace view-' + view;
    el.viewBtns.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view !== 'editor') renderPreview();
}

/* ------------------------------------------------------------
   7) الاتجاه RTL / LTR
------------------------------------------------------------ */
function setDirection(dir) {
    state.dir = dir;
    localStorage.setItem('md.dir', dir);
    el.html.dir = dir;
    el.dirLabel.textContent = dir.toUpperCase();
}

function toggleDirection() {
    setDirection(state.dir === 'rtl' ? 'ltr' : 'rtl');
}

/* ------------------------------------------------------------
   8) لغة الواجهة
------------------------------------------------------------ */
function applyLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('md.lang', lang);
    el.html.lang = I18N[lang].htmlLang;
    el.langLabel.textContent = lang === 'ar' ? 'EN' : 'ع';

    // ترجمة النصوص
    document.querySelectorAll('[data-i18n]').forEach((node) => {
        node.textContent = t(node.dataset.i18n);
    });
    // ترجمة التلميحات (title)
    document.querySelectorAll('[data-i18n-title]').forEach((node) => {
        node.title = t(node.dataset.i18nTitle);
    });
    // ترجمة placeholder
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => {
        node.placeholder = t(node.dataset.i18nPh);
    });

    document.title = t('appTitle') + ' | Markdown Editor';
    markDirty(state.dirty); // تحديث نص حالة الحفظ باللغة الجديدة
}

function toggleLanguage() {
    const newLang = state.lang === 'ar' ? 'en' : 'ar';
    applyLanguage(newLang);
    // تبديل الاتجاه تلقائياً مع اللغة (يمكن تعديله يدوياً بعدها)
    setDirection(newLang === 'ar' ? 'rtl' : 'ltr');
}

/* ------------------------------------------------------------
   9) المظهر: ليلي / نهاري
------------------------------------------------------------ */
function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('md.theme', theme);
    el.html.dataset.theme = theme;
    const dark = theme === 'dark';
    el.themeIcon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    // تبديل ثيم highlight.js
    el.hljsLight.disabled = dark;
    el.hljsDark.disabled = !dark;
}

function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/* ------------------------------------------------------------
   10) إشعارات Toast
------------------------------------------------------------ */
let toastTimer = null;
function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
}

/* ------------------------------------------------------------
   11) اختصارات لوحة المفاتيح
------------------------------------------------------------ */
function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') { e.preventDefault(); saveFile(); }
            if (e.key === 'o') { e.preventDefault(); el.fileInput.click(); }
        }
        // Tab داخل المحرر يُدرج مسافات بدل الخروج
        if (e.key === 'Tab' && document.activeElement === el.editor) {
            e.preventDefault();
            const { selectionStart: s, selectionEnd: eEnd, value } = el.editor;
            el.editor.value = value.slice(0, s) + '    ' + value.slice(eEnd);
            el.editor.selectionStart = el.editor.selectionEnd = s + 4;
            scheduleRender();
        }
    });
}

/* ------------------------------------------------------------
   12) المحتوى الافتراضي (عرض توضيحي ثنائي اللغة)
------------------------------------------------------------ */
const DEFAULT_CONTENT = `# مرحباً بك في محرر ماركداون 👋
# Welcome to Markdown Editor

هذا **محرر Markdown** مع *معاينة مباشرة* ودعم كامل للعربية والإنجليزية.
This is a **Markdown editor** with *live preview* and full Arabic/English support.

---

## الميزات | Features

- فتح وحفظ ملفات \`.md\`
- معاينة مباشرة أثناء الكتابة
- دعم RTL / LTR
- الوضع الليلي والنهاري 🌙☀️
- Drag & Drop file opening

## قائمة مهام | Task List

- [x] دعم العناوين والقوائم
- [x] دعم الجداول والأكواد
- [ ] جرّب الكتابة بنفسك!

## جدول | Table

| الميزة | Feature | الحالة |
|--------|---------|:------:|
| المعاينة المباشرة | Live Preview | ✅ |
| حفظ الملف | Save File | ✅ |
| الوضع الليلي | Dark Mode | ✅ |

## كود برمجي | Code

\`\`\`javascript
// مثال: دالة ترحيب
function greet(name) {
    return \`مرحباً ${'$'}{name}! Hello ${'$'}{name}!\`;
}
console.log(greet('أحمد'));
\`\`\`

## اقتباس | Blockquote

> «العلم في الصغر كالنقش على الحجر»
> "Knowledge acquired young is engraved in stone."

## رابط وصورة | Link & Image

[زيارة ويكيبيديا | Visit Wikipedia](https://www.wikipedia.org)

ابدأ التحرير الآن — امسح هذا النص واكتب ما تريد! ✍️
`;

/* ------------------------------------------------------------
   13) التهيئة وربط الأحداث
------------------------------------------------------------ */
function init() {
    // تطبيق الإعدادات المحفوظة
    applyTheme(state.theme);
    setDirection(state.dir);
    applyLanguage(state.lang);
    setView(state.view);

    // المحتوى الافتراضي
    el.editor.value = DEFAULT_CONTENT;
    renderPreview();

    // أحداث المحرر
    el.editor.addEventListener('input', () => {
        markDirty(true);
        scheduleRender();
    });

    // أزرار الملفات
    el.btnOpen.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) openFile(file);
        e.target.value = ''; // للسماح بفتح نفس الملف مجدداً
    });
    el.btnSave.addEventListener('click', saveFile);
    el.btnClear.addEventListener('click', clearContent);

    // أزرار الإعدادات
    el.btnDirection.addEventListener('click', toggleDirection);
    el.btnLang.addEventListener('click', toggleLanguage);
    el.btnTheme.addEventListener('click', toggleTheme);

    // أزرار وضع العرض
    el.viewBtns.forEach((btn) => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // تحذير قبل مغادرة الصفحة مع تعديلات غير محفوظة
    window.addEventListener('beforeunload', (e) => {
        if (state.dirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    setupDragAndDrop();
    setupShortcuts();
}

document.addEventListener('DOMContentLoaded', init);
