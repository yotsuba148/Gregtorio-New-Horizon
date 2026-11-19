(function(){
  'use strict';
  const opener = document.getElementById('player-manual-open');
  const dialog = document.getElementById('player-manual');
  const list = document.getElementById('player-manual-list');

  opener.addEventListener('click', () => {
    if (dialog.open) return;
    if (!list.childElementCount) {
      for (const entry of window.PLAYER_MANUAL_ENTRIES) {
        const article = document.createElement('article');
        const heading = document.createElement('h3');
        heading.textContent = entry.title;
        const paragraph = document.createElement('p');
        paragraph.textContent = entry.text;
        article.append(heading, paragraph);
        list.append(article);
      }
    }
    dialog.showModal();
    list.scrollTop = 0;
  });
})();
