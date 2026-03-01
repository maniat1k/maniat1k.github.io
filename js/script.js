(function($) {

  "use strict";

  $(function() {
    initIsotope();

    if (typeof lightbox !== "undefined") {
      lightbox.option({
        resizeDuration: 200,
        wrapAround: true,
        fitImagesInViewport: true
      });
    }
  });

  // init Isotope
  var initIsotope = function() {
    $(".grid").each(function() {
      var $grid = $(this);
      var $buttonGroup = $("#filters.button-group");
      if (!$buttonGroup.length) return;

      var $checked = $buttonGroup.find(".is-checked");
      var filterValue = $checked.attr("data-filter") || "*";

      $grid.isotope({
        itemSelector: ".portfolio-item",
        filter: filterValue
      });

      $buttonGroup.on("click", "a", function(e) {
        e.preventDefault();
        var $button = $(this);
        filterValue = $button.attr("data-filter");
        $grid.isotope({ filter: filterValue });
        $buttonGroup.find(".is-checked").removeClass("is-checked");
        $button.addClass("is-checked");
      });
    });
  };

})(jQuery);
