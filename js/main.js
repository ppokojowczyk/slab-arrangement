(function () {

  if (typeof $ === 'undefined') { document.getElementsByTagName('html')[0].innerHTML = 'Brak jQuery'; return; }

  'use strict';
  var Form = $('#appForm'); // Główny formularz;
  var Elements = $('#mainContainerElements'); // Elementy;
  var addElementButton = $('#formAddElement'); // Button "Dodaj element";
  var clearButton = $('#formClearButton'); // Button do czyszczenia formularza
  var $sidebar = $('.app-header'); // sidebar po lewej stronie
  var $sortType = $('#formSortType');
  $extraMarginField = $('#extraMargin');
  var _extraMargin = 0; // dodatkowa nadwyżka do każdego wymiaru;
  var precision = 0.01; // miejsca po przecinku
  var $lockOverlay = $('#lock-overlay'); // locker, blokuje ekran

  var lock = function () { $lockOverlay.show(); }
  var unlock = function () { $lockOverlay.hide(); }

  $('.logo').on('click', function () {
    window.open('http://www.artstonex.pl');
  });

  $sortType.on('change', function () {
    executeForm();
  });

  $extraMarginField.on('change', function (e) {
    _extraMargin = e.target.value || 0;
  });

  // ustaw miejsce po przecinku
  var setPrecision = function () {
    $('input[name=mainContainerWidth]').attr('step', precision);
    $('input[name=mainContainerHeight]').attr('step', precision);
  };

  // Obsługa formularza; zapis powoduje przekazanie danych do generatora;
  window.addEventListener('load', function () {
    var forms = document.getElementsByClassName('needs-validation');
    var validation = Array.prototype.filter.call(Form, function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (form.checkValidity() === false) {
          event.stopPropagation();
        } else {
          executeForm(event);
        }
        form.classList.add('was-validated');
      }, false);
    });
  }, false);

  // Button do dodawania elementów;
  addElementButton.on('click', function (event) {
    event.preventDefault();
    addElement();
    addOrdinals();
    Elements.scrollTop(Elements.prop('scrollHeight'));
    executeForm();
  });

  clearButton.on('click', function () {
    clearForm();
    Generator.clearCanvas();
  });

  // Button "Demo";
  $('#formDemoButton').on('click', function (event) {
    event.preventDefault();
    Generator.demo();
  });

  // Drukowanie;
  $('#formPdfButton').on('click', function (event) {
    event.preventDefault();
    Generator.pdf();
  });

  // Czyszczenie formularza;
  var clearForm = function () {
    Form.find('input[name=mainContainerWidth]').val(null);
    Form.find('input[name=mainContainerHeight]').val(null);
    Elements.find('.row').remove();
    addElement();
    addOrdinals();
  };

  /**
   * Dodaj numery porządkowe
   */
  var addOrdinals = function () {
    var counter = 1;
    $(Elements).find('.row').each(function () {
      $(this).find('.elements-list__item-counter').html(counter);
      counter++;
    });
  };

  // Dodaj nowy wiersz do listy elementów;
  var elementCounter = 0;
  var addElement = function (width, height) {

    // podstaw ostatnie wartości, z ostatniego elementu
    if (typeof width === 'undefined' && typeof height === 'undefined') {
      var $lastElement = Elements.find('.row').last();
      if ($lastElement.length) {
        var width = $lastElement.find('input[name=width]').val();
        var height = $lastElement.find('input[name=height]').val();
      }
    }

    var $newInput = $('<div class="row" />').append(
      $('<div class="col-sm-1 padding-small text-right" />').append(
        $('<span class="elements-list__item-counter" style="position: relative; top: 5px;" />').append()
      ),
      $('<div class="col-sm-4 padding-small" />').append(
        $('<div class="form-group" />').append(
          '<input type="number" step="' + precision + '" class="form-control" name="width" placeholder="Width [m]" value="' + width + '">'
        )
      ),
      $('<div class="col-sm-4 padding-small" />').append(
        $('<div class="form-group" />').append(
          '<input type="number" step="' + precision + '" class="form-control" name="height" placeholder="Height [m]" value="' + height + '">'
        )
      ),
      $('<div class="col-sm-3 padding-small" />').append(
        $('<div class="form-group" />').append(
          $('<button class="btn btn-danger"><i class="fa fa-minus"></i></button>').click(function (event2) {
            event2.preventDefault();
            if (Elements.find('.row').length > 1) {
              $newInput.remove();
              addOrdinals();
              executeForm();
            }
          })
        )
      ),
    );
    elementCounter++;
    Elements.append($newInput);
  };

  /**
   * Generator propozycji; obiekt obsługuje cały proces;
   */
  Generator = {
    // Struktura danych
    canvas: $('#Canvas'),
    dataSchema: {
      container: {
        width: 0,
        height: 0,
        elements: [
          { width: 0, height: 0 }
        ]
      }
    },
    data: {},
    result: {},
    cleanup: function () {
      this.data = {};
      this.result = {};
    },
    getResult: function () {
      return this.result;
    },
    // dodaj nadwyżkę do każdego elementu;
    addExtraMargin: function (extraMargin) {
      $.each(this.data.elements, function (i, element) {
        element.origWidth = element.width;
        element.origHeight = element.height;
        element.width += 2 * extraMargin;
        element.height += 2 * extraMargin;
      });
    },
    generate: function () {
      var mode = $sortType.val();
      this.sort.type = mode;
      this.result = this.resolvers.binPacking(this.data);
      this.render();
      this.cleanup();
    },
    // walidacja danych
    validate: function () {
      var data = this.data;
      var valid = true;
      data.container.width = parseFloat(data.container.width);
      data.container.height = parseFloat(data.container.height);
      valid = data.container.width > 0 && data.container.height > 0;
      this.removeOversizedElements(); // pozbądź się zbyt dużych elementów
      return valid;
    },
    // pozbądź się zbyt dużych elementów, które i tak się nie zmieszczą w SLAB-ie
    removeOversizedElements: function () {
      var maxWidth = this.data.container.width; // szerokość slab-a
      var maxHeight = this.data.container.height; // wysokość slab-a
      var cleaned = [];
      $.each(this.data.elements, function (i, element) {
        if (element.width <= maxWidth && element.height <= maxHeight) {
          cleaned.push(element);
        }
      });
      this.data.elements = cleaned;
    },
    setData: function (data) {
      this.data = data;
      this.addExtraMargin(_extraMargin);
    },
    clearCanvas: function () {
      this.canvas.html(null);
    },
    setSort: function (type) {
      this.sort.type = type;
    },
    // funkcja do sortowania;
    sort: {
      type: 'maxside',
      main: null,
      random: function (a, b) { return Math.random() - 0.5; },
      w: function (a, b) { return b.w - a.w; },
      h: function (a, b) { return b.h - a.h; },
      a: function (a, b) { return b.area - a.area; },
      max: function (a, b) { return Math.max(b.w, b.h) - Math.max(a.w, a.h); },
      min: function (a, b) { return Math.min(b.w, b.h) - Math.min(a.w, a.h); },

      height: function (a, b) { return Generator.sort.msort(a, b, ['h', 'w']); },
      width: function (a, b) { return Generator.sort.msort(a, b, ['w', 'h']); },
      maxside: function (a, b) { return Generator.sort.msort(a, b, ['max', 'min', 'h', 'w']); },
      area: function (a, b) { return Generator.sort.msort(a, b, ['a', 'h', 'w']); },

      msort: function (a, b, criteria) { /* sort by multiple criteria */
        var diff, n;
        for (n = 0; n < criteria.length; n++) {
          diff = this.main.sort[criteria[n]](a, b);
          if (diff != 0)
            return diff;
        }
        return 0;
      },
      now: function (blocks) {
        blocks.sort(this[this.type]);
      }
    },

    resolvers: {
      main: null,
      binPacking: function (data) {
        var main = this.main;
        var result = [];
        var blocks = [];

        for (var i in data.elements) {
          var element = data.elements[i];
          blocks.push({
            w: element.width,
            h: element.height,
            _origWidth: element.origWidth,
            _origHeight: element.origHeight
          });
        }

        var process = function () {

          if (!(data.container.width > 0 && data.container.height > 0)) { return false; }

          var packer = new Packer(data.container.width, data.container.height);
          var tmp = { width: data.container.width, height: data.container.height, elements: [], fitPercentage: 0, elementsTotalSize: 0, size: 0, left: 0 }
          var left = [];

          main.sort.now(blocks);
          packer.fit(blocks);

          for (var n = 0; n < blocks.length; n++) {
            var block = blocks[n];
            if (block.fit) {
              tmp.elements.push({
                x: block.fit.x,
                y: block.fit.y,
                width: block.w,
                height: block.h,
                _origWidth: block._origWidth,
                _origHeight: block._origHeight,
                _size: block.w * block.h
              });
              tmp.elementsTotalSize += block.w * block.h;
            } else {
              left.push(block);
            }
          }

          tmp.size = tmp.width * tmp.height; // w milimetrach
          tmp.left = tmp.size - tmp.elementsTotalSize; // w milimetrach
          tmp.fitPercentage = Math.round(100 * tmp.elementsTotalSize / (tmp.size)); // zajętość procentowa
          result.push(tmp);

          if (left.length) {
            blocks = left;
            process();
          }
        };

        process();

        return result;
      }
    },
    /**
     * Funkcja ustala konkretną szerokość dla elementu #Canvas.
     * --- przy "elastycznej" szerokości renderowanie nie było dokładne, zwłaszcza ruler był przesunięty ---
     */
    setFixedWidth() {
      var fixedWidth = $('.generator-output-column').width() - 30; // szerokość kolumny +
      this.canvas.width(fixedWidth); // ustalamy stałą szerokość kontenera; krzaczy się przy autodopasowaniu;
    },
    renderer: {
      main: null,
      scaleFactor: function (x) {
        return (this.main.canvas.width()) / this.main.result[0].width;
      },
      renderContainers: function () {

        var main = this.main;
        var data = main.result;
        var factor = this.scaleFactor();

        $.each(data, function (i, container) {
          container.width = container.width * factor;
          container.height = container.height * factor;
          $.each(container.elements, function (ii, element) {
            element.origWidth = element._origWidth / 1000;
            element.origHeight = element._origHeight / 1000;
            element.width = element.width * factor;
            element.height = element.height * factor;
            element.x = element.x * factor;
            element.y = element.y * factor;
          })
        });

        for (var i in data) {

          var Container = data[i];

          // element - kontener SLAB
          var $container = $('<div class="canvas-container"/>').css({
            width: Container.width,
            height: Container.height
          });

          // element przechowujący linijkę
          var $containerRuler = $('<div class="canvas-container-ruler" />').css({
            width: Container.width + 18,
            height: Container.height + 18
          });
          $container.append($containerRuler);

          var $info = $('<div />')
            .addClass('canvas-container-info')
            .append('Surface: ' + Container.size / 1000000 + ' &#13217;')
            .append(' &bull; Filled: ' + (Container.elementsTotalSize / 1000000) + ' &#13217; (' + Container.fitPercentage + '%)')
            .append(' &bull; Left: ' + (Container.left / 1000000) + ' &#13217;')
            .appendTo($container);

          for (var ii in Container.elements) {
            var Element = Container.elements[ii];
            var $element = $('<div class="canvas-container-element"/>').css({
              width: Element.width,
              height: Element.height,
              left: Element.x,
              top: Element.y,
            });

            // tutaj dodajemy etykietę z wymiarami elementu
            var $label = $('<span />')
              .addClass('canvas-container-element__label')
              .append(Element.origWidth + ' &times; ' + Element.origHeight)
              .appendTo($element);

            $container.append($element);
            $label.css('lineHeight', Element.height + 'px');
          }
          main.canvas.append($container);
          main.addRuler($containerRuler);
        }
      }
    },
    /**
    * Dodaj linijkę do SLAB-a
    * @param {Object} jQuery object
    */
    addRuler: function ($container) {
      $container.ruler({
        unit: 'artstonex',
        tickMajor: 10,
        tickMinor: 10,
        tickMicro: 1,
        showLabel: true,
        arrowStyle: 'none',
        unitPosMultiplier: 10
      });
    },

    render: function () {
      this.renderer.renderContainers();
    },
    init: function () {
      this.renderer.main = this;
      this.sort.main = this;
      this.resolvers.main = this;
    },
    /**
     * Generowanie dokumentu PDF
     * - tutaj wykorzystuję bibliotekę jspdf
     */
    pdf: function () {

      lock();
      var type = 'blob';
      var doc = new jsPDF({ orientation: 'portrait', unit: 'cm' });
      var margins = {
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        width: $('#Canvas').width() + 100
      };

      //var documentContent = Generator.canvas[0];
      var documentContent = $('.pdf-output-wrapper');
      documentContent.addClass('pdf-output');

      doc.addHTML(
        documentContent[0],
        margins.left,
        margins.top,
        { width: margins.width, format: 'PNG' },
        function () {

          if (type === 'datauristring') {

            // otwieranie base64
            var string = doc.output('datauristring');
            var iframe = "<iframe width='100%' height='100%' src='" + string + "'></iframe>";
            var w = window.open();
            w.document.open();
            w.document.write(iframe);
            w.document.close();

          } else if (type === 'blob') {

            // otwieranie blob-a
            var blob = doc.output('blob');
            var url = URL.createObjectURL(blob);
            var win = window.open(url);

          } else if (type === 'file') {

            // pobieranie pliku
            var D = new Date();
            var date = (D.getDate() < 10 ? '0' : '') + D.getDate() + '_' + (D.getMonth() < 10 ? '0' : '') + D.getMonth() + '_' + D.getFullYear() + (D.getHours() < 10 ? '0' : '') + '_' + D.getHours() + '_' + (D.getHours() < 10 ? '0' : '') + D.getMinutes();
            doc.save('SLAB_' + date + '.pdf');

          }

          documentContent.removeClass('pdf-output');
          unlock();
        },
        margins
      );
    },
    // Demonstracja
    demo: function () {
      clearForm();
      Form.find('input[name=mainContainerWidth]').val(2.3);
      Form.find('input[name=mainContainerHeight]').val(1.2);
      $extraMarginField.val(4);
      _extraMargin = 4;
      addElement(0.25, 0.3);
      addElement(0.25, 0.3);
      addElement(0.25, 0.3);
      addElement(0.25, 0.3);
      addElement(0.25, 0.3);
      addElement(0.25, 0.3);
      addElement(0.17, 0.15);
      addElement(0.17, 0.15);
      addElement(0.17, 0.15);
      addElement(0.17, 0.15);
      addElement(0.17, 0.15);
      addElement(0.17, 0.15);
      addElement(0.07, 0.06);
      addElement(0.07, 0.06);
      addElement(0.07, 0.06);
      addElement(0.07, 0.06);
      addElement(0.07, 0.06);
      addElement(0.07, 0.06);
      Elements.find('.row').eq(0).remove();
      addOrdinals();
      Form.find('button[type=submit]').click();
    }
  };

  /**
   * Dopasuj wysokość menu
   */
  var fitSidebar = function () {
    var sidebarHeight = $(document).height() - 20; // wysokość sidebara po lewej stronie minus stopka (60px) oraz odstęp góra i dół (po 20 px);
    $sidebar.css('height', sidebarHeight); // ustawiamy nową wysokość sidebar-a
    setTimeout(function () {
      var listHeight = sidebarHeight - Elements.offset().top; // nowa wysokość listy elementów
      Elements.css('height', listHeight); // ustawiamy wysokość listy
    }, 50);
  };

  /**
   * Dane formularza zamień na obiekt
   */
  var formDataToObject = function (formData) {
    var data = {};
    for (var i in formData) {
      data[formData[i]['name']] = formData[i]['value'];
    }
    return data;
  };

  /**
   * Zapis formularza powinien przekazać wszystkie dane do generatora.
   */
  var executeForm = function (e) {

    var data = {
      container: {
        width: Form.find('input[name=mainContainerWidth]').val() * 1000,
        height: Form.find('input[name=mainContainerHeight]').val() * 1000
      },
      elements: []
    };

    // dodaj wymiary elementu według elementów DOM
    Elements.find('.row').each(function (i, el) {
      var $el = $(el);
      var elementWidth = $el.find('input[name=width]').val() * 1000; // szerokość elementu
      var elementHeight = $el.find('input[name=height]').val() * 1000; // wysokość elementu
      if (elementWidth > 0 && elementHeight > 0) {
        data.elements.push({ width: elementWidth, height: elementHeight }); // dodaj element do listy
      }
    });

    Generator.setData(data);

    // Dokonujemy walidacji danych; w przypadku pomyślnego rezultatu generujemy propozycje;
    if (Generator.validate()) {
      Generator.setFixedWidth();
      Generator.clearCanvas();
      Generator.generate();
      Generator.cleanup();
    }
  }

  // podczas zmiany rozmiaru okna wygeneruj propozycje ponownie
  $(window).resize(function () {
    executeForm();
  });

  $(document).ready(function () {
    Generator.init();
    addElement();
    addOrdinals();
    setPrecision();
    fitSidebar();
  });

})();
