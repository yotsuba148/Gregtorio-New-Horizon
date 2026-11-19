/* 记住上次打开的导航页。 */
(function (root) {
  'use strict';
  function register() {
    if (root.STATE_SCHEMA) STATE_SCHEMA.register('ui-page', ['uiPage']);
  }
  function remember(S) {
    if (S && S.ui) S.uiPage = S.ui.page;
  }
  function restore(S) {
    if (S && S.uiPage && S.ui) S.ui.page = S.uiPage;
  }
  root.UI_STATE = { register: register, remember: remember, restore: restore };
})(typeof window !== 'undefined' ? window : globalThis);
