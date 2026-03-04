function showPage(pageId) {
  document.querySelectorAll('div[id$="Page"]').forEach(d => d.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
}