import { createCheckIcon, createCloseIcon, createTrashIcon } from './dom.js?v=type1';

function createActionButton(labelText, icon, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', labelText);
  const label = document.createElement('span');
  label.className = 'tree-link-update-label';
  label.textContent = labelText;
  button.appendChild(label);
  button.appendChild(icon);
  return button;
}

export function createActionBar({
  confirmLabel = 'SAVE',
  confirmIcon = createCheckIcon(),
  confirmClass = 'tree-link-bar-save',
  barClass = '',
  onConfirm,
  onCancel,
} = {}) {
  const bar = document.createElement('div');
  bar.className = barClass ? `tree-link-action-bar ${barClass}` : 'tree-link-action-bar';
  const cancelBtn = createActionButton('CANCEL', createCloseIcon(), 'tree-link-bar-cancel');
  const confirmBtn = createActionButton(confirmLabel, confirmIcon, confirmClass);
  cancelBtn.addEventListener('click', onCancel);
  confirmBtn.addEventListener('click', onConfirm);
  bar.appendChild(cancelBtn);
  bar.appendChild(confirmBtn);
  return bar;
}

export function createEditorActionBar(onSave, onCancel) {
  return createActionBar({ onConfirm: onSave, onCancel });
}

export function createDeleteActionBar(onDelete, onCancel) {
  return createActionBar({
    confirmLabel: 'DELETE',
    confirmIcon: createTrashIcon(18),
    confirmClass: 'tree-link-bar-delete',
    barClass: 'tree-link-confirm-bar',
    onConfirm: onDelete,
    onCancel,
  });
}
