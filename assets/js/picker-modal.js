// Componente global reutilizável: Modal de seleção com pesquisa.
//
// Uso:
//   import { openPickerModal } from "./picker-modal.js";
//
//   const value = await openPickerModal({
//     title: "Selecionar tipo",
//     placeholder: "Pesquisar...",
//     options: [
//       { value: "USB", label: "Unidade de Suporte Básico", badge: "USB" },
//     ],
//     // Opcional: botão + formulário de cadastro no rodapé
//     footerAction: {
//       label: "Cadastrar novo",
//       icon: "fa-solid fa-plus",
//       fields: [
//         { name: "marca", label: "Marca", placeholder: "Ex.: Ford" },
//         { name: "modelo", label: "Modelo", placeholder: "Ex.: Transit" },
//       ],
//       submitLabel: "Adicionar",
//     },
//   });
//
//   // Retorno:
//   // value = "USB"                              → opção selecionada
//   // value = { __new__: true, marca: "...", ... } → cadastro novo
//   // value = null                                → cancelou

let _overlay = null;
let _resolve = null;
let _footerConfig = null;
let _optionsConfig = null;
let _currentEditValue = null;

function esc(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

/* ---- DOM singleton ---- */

function ensureDOM() {
  if (_overlay) return;

  const div = document.createElement("div");
  div.id = "pickerModal";
  div.className = "picker-modal-overlay";
  div.hidden = true;
  div.innerHTML = `
    <div class="picker-modal-box">
      <div class="picker-modal-header">
        <h3 id="pickerModalTitle"></h3>
        <button id="pickerModalClose" class="modal-close" type="button"
                aria-label="Fechar" title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Modo lista (seleção) -->
      <div id="pickerModalListView">
        <div class="picker-modal-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="picker-modal-search" id="pickerModalSearch"
                 placeholder="Pesquisar..." autocomplete="off" />
        </div>
        <ul class="picker-modal-list" id="pickerModalList"></ul>
        <div class="picker-modal-empty" id="pickerModalEmpty" hidden>
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Nenhum resultado</span>
        </div>
        <div class="picker-modal-footer" id="pickerModalFooter" hidden>
          <button type="button" class="picker-modal-footer-btn" id="pickerModalFooterBtn"></button>
        </div>
      </div>

      <!-- Modo formulário (cadastro) -->
      <div id="pickerModalFormView" class="picker-modal-form-view" hidden>
        <div class="picker-modal-form-fields" id="pickerModalFormFields"></div>
        <div class="picker-modal-form-error" id="pickerModalFormError" hidden>
          <i class="fa-solid fa-circle-exclamation"></i>
          <span id="pickerModalFormErrorMsg"></span>
        </div>
        <div class="picker-modal-form-actions">
          <button type="button" class="picker-modal-form-back" id="pickerModalFormBack">
            <i class="fa-solid fa-arrow-left"></i> Voltar
          </button>
          <button type="button" class="picker-modal-form-submit" id="pickerModalFormSubmit">
            <i class="fa-solid fa-check"></i> Adicionar
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  _overlay = div;

  // Fechar
  document.getElementById("pickerModalClose").addEventListener("click", close);

  // Pesquisa
  document.getElementById("pickerModalSearch").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const list = document.getElementById("pickerModalList");
    const empty = document.getElementById("pickerModalEmpty");
    let visible = 0;
    list.querySelectorAll(".picker-modal-option").forEach((li) => {
      const match = !query || li.textContent.toLowerCase().includes(query);
      li.hidden = !match;
      if (match) visible++;
    });
    if (empty) empty.hidden = visible > 0;
  });

  // Seleção
  document.getElementById("pickerModalList").addEventListener("click", (e) => {
    // Clique em editar?
    const editBtn = e.target.closest("[data-edit-value]");
    if (editBtn) {
      e.stopPropagation();
      const value = editBtn.dataset.editValue;
      const opt = _optionsConfig.find((o) => o.value === value);
      if (opt && opt.editData) {
        showFormView(opt.editData, value);
      }
      return;
    }

    // Clique na opção inteira
    const option = e.target.closest("[data-picker-value]");
    if (!option) return;
    if (_resolve) {
      _resolve(option.dataset.pickerValue);
      _resolve = null;
    }
    close();
  });

  // Footer → abrir formulário
  document.getElementById("pickerModalFooterBtn").addEventListener("click", () => {
    showFormView();
  });

  // Voltar → lista
  document.getElementById("pickerModalFormBack").addEventListener("click", () => {
    showListView();
  });

  // Submit formulário
  document.getElementById("pickerModalFormSubmit").addEventListener("click", () => {
    submitForm();
  });

  // Esc fecha
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _overlay && !_overlay.hidden) {
      e.stopPropagation();
      close();
    }
  });
}

/* ---- Alternar views ---- */

function showListView() {
  document.getElementById("pickerModalListView").hidden = false;
  document.getElementById("pickerModalFormView").hidden = true;
  const search = document.getElementById("pickerModalSearch");
  search.focus();
}

function showFormView(initialData = null, originalValue = null) {
  if (!_footerConfig || !_footerConfig.fields) return;

  _currentEditValue = originalValue;

  const container = document.getElementById("pickerModalFormFields");
  container.innerHTML = _footerConfig.fields
    .map(
      (f) => `
      <div class="picker-modal-form-group">
        <label>${esc(f.label)}</label>
        <input type="text" data-field-name="${esc(f.name)}"
               placeholder="${esc(f.placeholder || "")}" autocomplete="off" />
        ${f.suggestions ? '<ul class="picker-modal-autocomplete" hidden></ul>' : ""}
      </div>`,
    )
    .join("");

  // Montar autocomplete para campos com suggestions
  _footerConfig.fields.forEach((f) => {
    if (!f.suggestions || !f.suggestions.length) return;

    const group = container.querySelector(`input[data-field-name="${f.name}"]`).closest(".picker-modal-form-group");
    const input = group.querySelector("input");
    const dropdown = group.querySelector(".picker-modal-autocomplete");

    function updateSuggestions() {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        dropdown.hidden = true;
        return;
      }
      const matches = f.suggestions.filter((s) =>
        s.toLowerCase().includes(query),
      );
      if (!matches.length || (matches.length === 1 && matches[0].toLowerCase() === query)) {
        dropdown.hidden = true;
        return;
      }
      dropdown.innerHTML = matches
        .map((s) => `<li class="picker-modal-autocomplete-item">${esc(s)}</li>`)
        .join("");
      dropdown.hidden = false;
    }

    input.addEventListener("input", updateSuggestions);
    input.addEventListener("focus", updateSuggestions);

    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".picker-modal-autocomplete-item");
      if (!item) return;
      input.value = item.textContent;
      dropdown.hidden = true;
    });
  });

  // Atualizar label do submit
  const submitBtn = document.getElementById("pickerModalFormSubmit");
  if (_currentEditValue && _footerConfig.editSubmitLabel) {
    submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${esc(_footerConfig.editSubmitLabel)}`;
  } else if (_footerConfig.submitLabel) {
    submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${esc(_footerConfig.submitLabel)}`;
  }

  // Preencher campos se for edição
  if (initialData) {
    _footerConfig.fields.forEach((f) => {
      const input = container.querySelector(`input[data-field-name="${f.name}"]`);
      if (input && initialData[f.name] !== undefined) {
        input.value = initialData[f.name];
      }
    });
  }

  document.getElementById("pickerModalListView").hidden = true;
  document.getElementById("pickerModalFormView").hidden = false;

  // Foca no primeiro campo
  const firstInput = container.querySelector("input");
  if (firstInput) firstInput.focus();
}

function submitForm() {
  const container = document.getElementById("pickerModalFormFields");
  const inputs = container.querySelectorAll("input[data-field-name]");
  const errorEl = document.getElementById("pickerModalFormError");
  const errorMsg = document.getElementById("pickerModalFormErrorMsg");
  const result = _currentEditValue
    ? { __edit__: true, originalValue: _currentEditValue }
    : { __new__: true };
  let hasEmpty = false;

  // Limpa erros anteriores
  errorEl.hidden = true;
  inputs.forEach((input) => {
    input.style.borderColor = "";
    input.style.boxShadow = "";
  });

  // Valida campos vazios
  inputs.forEach((input) => {
    const val = input.value.trim();
    if (!val) {
      hasEmpty = true;
      input.style.borderColor = "#e21b1b";
      input.style.boxShadow = "0 0 0 3px rgba(226,27,27,0.14)";
    }
    result[input.dataset.fieldName] = val;
  });

  if (hasEmpty) return;

  // Validação customizada via callback
  if (_footerConfig && _footerConfig.validate) {
    const error = _footerConfig.validate(result, !!_currentEditValue, _currentEditValue);
    if (error) {
      // Destaca o campo com erro
      if (error.field) {
        const fieldInput = container.querySelector(`input[data-field-name="${error.field}"]`);
        if (fieldInput) {
          fieldInput.style.borderColor = "#e21b1b";
          fieldInput.style.boxShadow = "0 0 0 3px rgba(226,27,27,0.14)";
          fieldInput.focus();
        }
      }
      // Exibe mensagem
      errorMsg.textContent = error.message || "Valor inválido.";
      errorEl.hidden = false;
      return;
    }
  }

  if (_resolve) {
    _resolve(result);
    _resolve = null;
  }
  close();
}

/* ---- Fechar ---- */

function close() {
  if (_overlay) _overlay.hidden = true;
  _currentEditValue = null;
  // Reset para list view para próxima abertura
  const listView = document.getElementById("pickerModalListView");
  const formView = document.getElementById("pickerModalFormView");
  if (listView) listView.hidden = false;
  if (formView) formView.hidden = true;

  if (_resolve) {
    _resolve(null);
    _resolve = null;
  }
}

/* ---- API pública ---- */

/**
 * Abre o modal de seleção com pesquisa.
 *
 * @param {Object}  config
 * @param {string}  config.title       - Título do modal.
 * @param {string}  [config.placeholder] - Placeholder do campo de pesquisa.
 * @param {Array<{value:string, label:string, badge?:string}>} config.options
 * @param {Object}  [config.footerAction] - Botão de ação com formulário no rodapé.
 * @param {string}  config.footerAction.label - Texto do botão.
 * @param {string}  [config.footerAction.icon] - Classe do ícone.
 * @param {Array<{name:string, label:string, placeholder?:string}>} [config.footerAction.fields]
 * @param {string}  [config.footerAction.submitLabel] - Texto do botão submit.
 * @returns {Promise<string|{__new__:true, [key:string]:string}|null>}
 */
export function openPickerModal({ title, placeholder, options, footerAction }) {
  ensureDOM();
  _footerConfig = footerAction || null;
  _optionsConfig = options || [];

  // Preenche título e pesquisa
  document.getElementById("pickerModalTitle").innerHTML = title;
  const search = document.getElementById("pickerModalSearch");
  search.placeholder = placeholder || "Pesquisar...";
  search.value = "";

  // Monta a lista de opções
  const list = document.getElementById("pickerModalList");
  list.innerHTML = _optionsConfig
    .map(
      (opt) => `
      <li class="picker-modal-option" data-picker-value="${esc(opt.value)}">
        <span class="picker-modal-label-wrap">
          ${opt.badge ? `<span class="picker-modal-badge">${esc(opt.badge)}</span>` : ""}
          <span class="picker-modal-label">${esc(opt.label)}</span>
        </span>
        ${opt.editData ? `<button class="picker-modal-edit-btn" data-edit-value="${esc(opt.value)}" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ""}
      </li>`,
    )
    .join("");

  // Esconde "nenhum resultado"
  document.getElementById("pickerModalEmpty").hidden = true;

  // Rodapé com ação
  const footer = document.getElementById("pickerModalFooter");
  const footerBtn = document.getElementById("pickerModalFooterBtn");
  if (footerAction) {
    const iconHtml = footerAction.icon
      ? `<i class="${footerAction.icon}"></i> `
      : "";
    footerBtn.innerHTML = iconHtml + esc(footerAction.label);
    footer.hidden = false;
  } else {
    footer.hidden = true;
  }

  // Garante modo lista
  showListView();

  // Exibe e foca
  _overlay.hidden = false;
  search.focus();

  return new Promise((resolve) => {
    _resolve = resolve;
  });
}
