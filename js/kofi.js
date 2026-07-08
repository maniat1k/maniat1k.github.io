(function () {
  "use strict";

  const KOFI_URL = "https://ko-fi.com/maniat1kuy";

  document.querySelectorAll("[data-kofi-link]").forEach(function (link) {
    link.href = KOFI_URL;
  });

  if (window.kofiWidgetOverlay) {
    window.kofiWidgetOverlay.draw("maniat1kuy", {
      type: "floating-chat",
      "floating-chat.donateButton.text": "invitame!",
      "floating-chat.donateButton.background-color": "#00b9fe",
      "floating-chat.donateButton.text-color": "#fff"
    });
  }
})();
