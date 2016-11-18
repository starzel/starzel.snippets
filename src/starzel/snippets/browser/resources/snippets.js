/* global $, tinyMCEPopup, tinyMCE, tinymce, jQuery:false, document:false, window:false, location:false */

(function () {
  'use strict';

  // first, load styles for this guy...
  var head  = document.getElementsByTagName('head')[0];
  var link  = document.createElement('link');
  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = $('body').attr('data-portal-url') + '/++resource++starzel.snippets/plugin-styles.css';
  link.media = 'all';
  head.appendChild(link);

  // need to do it this way so tinymce loads properly
  var _ = require('underscore');
  var utils = require('mockup-utils');
  var Modal = require('mockup-patterns-modal');
  var API_URL = $('body').attr('data-base-url') + '/@@snippets-api';
  var THIS_UID = null; // UID of current object

  var reOptions = {
    vocabularyUrl: $('body').attr('data-portal-url') + '/@@getVocabulary?name=plone.app.vocabularies.Catalog',
    maximumSelectionSize: 1
  };

  // load config
  $.ajax({
    url: API_URL,
    data: {
      action: 'configuration'
    }
  }).done(function(data){
    reOptions = $.extend({}, true, reOptions, JSON.parse(data.relatedItemsOptions));
    THIS_UID = data.uid;
  });


  var SnippetModal = function(options){
    var that = this;

    that.options = options;
    that.range = options.editor.selection.getRng();
    that.originalEl = options.editor.selection.getNode();

    var uid = '';
    // force loading existing value if something selected
    if(options.$node){
      uid = options.$node.attr('data-snippet-id');
    }else{
      // need to create a temp node so we can insert stuff in for rendering
      // in the same place the cursor was
      var id = utils.generateId();
      options.editor.insertContent(
        options.editor.dom.createHTML('span', {
          style: 'display:none',
          id: id,
          class: 'hidden-snippet'}));
      that.$tempNode = $('#' + id, options.editor.getBody());
    }

    that.modal = new Modal(options.$el, {
      html: that.template({
        reOptions: JSON.stringify(reOptions),
        uid: uid
      }),
      content: null,
      buttons: '.plone-btn'
    });
    that.modal.on('shown', function() {
      that.init();
      that.options.editor.focus();
      that.options.editor.selection.select(that.originalEl);
      that.options.editor.nodeChanged();

      if(uid){
        var indent = options.$node.attr('data-snippet-indent');
        if(indent){
          $('.snippets-indent select').val(indent);
        }
        that.loadUID(uid);
      }
    });
  };

  SnippetModal.prototype.show = function(){
    this.modal.show();
  };

  SnippetModal.prototype.template = _.template('<div>' +
    '<h1>Help einbetten</h1>' +
    '<div>' +
      '<div class="form-group snippets-content">' +
        '<label>Inhalt auswählen</label>' +
        '<input class="pat-relateditems" type="text" value="<%= uid %>"' +
              " data-pat-relateditems='<%= reOptions %>' />" +
      '</div>' +
      '<div class="form-group snippets-indent">' +
        '<label>Anpassung der Überschriften-Level</label>' +
        '<select>' +
          '<option value="-5">-5</option>' +
          '<option value="-4">-4</option>' +
          '<option value="-3">-3</option>' +
          '<option value="-2">-2</option>' +
          '<option value="-1">-1</option>' +
          '<option value="0" selected="true">0</option>' +
          '<option value="1">1</option>' +
          '<option value="2">2</option>' +
          '<option value="3">3</option>' +
          '<option value="4">4</option>' +
          '<option value="5">5</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="portalMessage warning" style="display:none">' +
      '<strong>Warnung</strong>' +
        'Die Überschriften-Reihenfolge des Zieldokumentes entspricht nicht gültigen Standards.' +
    '</div>' +
    '<div class="snippets-preview" style="display: none">' +
      '<h2>Vorschau</h2>' +
      '<div class="inner"></div>' +
    '</div>' +
    '<button class="plone-btn plone-btn-default cancel-btn">Abbrechen</button>' +
    '<button class="plone-btn plone-btn-primary insert-btn" disabled="true">Einfügen</button>' +
  '</div>');

  SnippetModal.prototype.init = function(){
    var that = this;
    var modal = this.modal;

    var $re = $('input.pat-relateditems', modal.$modal);
    var re = $re.data('pattern-relateditems');
    this.re = re;

    // pay attention to browsing option
    if(re.options.browsing){
      re.browsing = re.options.browsing;
    }

    re.$el.on('change', function(){
      // populate preview
      that.update(true);
    });

    re.$el.on('select2-loaded', function(e){
      e.items.results.forEach(function(item, idx){
        if(item.UID === THIS_UID){
          $('.select2-drop-active .select2-result').eq(idx).remove();
        }
      });
    });

    $('.snippets-indent select').on('change', function(){
      that.update();
    });

    $('button', modal.$modal).off('click').on('click', function(){
      var $btn = $(this);
      that.btnClicked($btn);
    });
  };

  SnippetModal.prototype.getIndentLevel = function(){
    var indent = $('.snippets-indent select', this.modal.$modal).val();
    return parseInt(indent);
  };

  SnippetModal.prototype.loadUID = function(uid, newSnippet){
    var that = this;
    var modal = that.modal;

    // this may be weird but in order for us to get the output the way we want
    // it, we need to render the entire output.
    // This is complicated because...
    // 1) we don't want to modify the DOM until we "save"
    // 2) new snippets are not inserted until "save"
    // 3) can't change the DOM or cursor will get messed up...
    // so in order for this to work we need to:
    // 1) get html copy
    // 2) update snippet attributes
    // 3) ask plone to render it for us
    // this way requires there to be a temp node with id we are currently
    // pointing at for new snippets OR existing snippets need unique ID
    var $snippetNode = that.options.$node || that.$tempNode;
    var id = $snippetNode.attr('id');
    if(!id){
      id = utils.setId($snippetNode);
    }

    var $dom = $(that.options.editor.getBody()).clone();

    // tinymce adds a duplicate node to show selection but hides offscreen
    $('.mce-offscreen-selection', $dom).remove();

    var $outputSnippetNode = $('#' + id, $dom);
    $outputSnippetNode.attr({
      class: 'snippet-tag',
      'data-type': 'snippet_tag',
      'data-snippet-id': uid,
      'data-snippet-indent': that.getIndentLevel()
    });
    var html = $dom.html();

    utils.loading.show();
    $.ajax({
      url: API_URL,
      data: {
        html: html,
        action: 'transform',
        method: 'POST'
      }
    }).done(function(data){
      $('.insert-btn', modal.$modal).removeAttr('disabled');
      var $els = $('<div>' + data.result + '</div>');
      $('.snippets-preview', modal.$modal).show();
      $('.snippets-preview .inner', modal.$modal).empty().append($els);

      if(newSnippet && !that.options.$node){
        if(that.guessHeaderLevel()){
          // reload it because the guessed version has changed...
          that.loadUID(uid);
        }
      }

      that.check508();
      that.addHeaderAnnotations();
    }).fail(function(){
      alert('Fehler beim Laden des Snippets');
    }).always(function(){
      utils.loading.hide();
    });
  };

  SnippetModal.prototype.guessHeaderLevel = function(){
    var that = this;
    var $topHeader = that.getClosestContentHeader();
    var $snippetHeader = that.getFirstSnippetHeader();

    if($topHeader.length === 0 || $snippetHeader.length === 0){
      return;
    }
    var topHeaderLevel = parseInt($topHeader[0].tagName[1]);
    var snippetHeaderLevel = parseInt($snippetHeader[0].tagName[1]);
    var newLevel = topHeaderLevel - snippetHeaderLevel;
    if(newLevel != that.getIndentLevel()){
      $('.snippets-indent select', this.modal.$modal).val(topHeaderLevel - snippetHeaderLevel);
      return true;
    }
    return false;
  };

  SnippetModal.prototype.addHeaderAnnotations = function(){
    // add h1 -> h3 info on each header
    $('h1,h2,h3,h4,h5,h6', $('.snippets-preview .inner')).each(function(){
      var current = this.tagName;
      var original = this.getAttribute('original-tag');
      if(!original){
        $(this).prepend($(
          '<div class="annotation nochange">' +
            '<span class="to">' + current.toUpperCase() + '</span>' +
          '</div>'));
      }else {
        $(this).prepend($(
          '<div class="annotation">' +
            '<span class="from">' + original.toUpperCase() + '</span>' +
            '<span class="sep"> ➔ </span>' +
            '<span class="to">' + current.toUpperCase() + '</span>' +
          '</div>'));
      }
    });
  };

  SnippetModal.prototype.getClosestContentHeader = function(){
    var that = this;
    var $topHeader = [];
    var $node = that.options.$node;
    if(!$node){
      // new snippet
      $node = $(that.options.editor.selection.getNode());
    }
    var $els = $('*', that.options.editor.getBody());
    // need to find the last header BEFORE the current position
    for(var i=0; i<$els.length; i++){
      var $el = $els.eq(i);
      if($el.is('h1,h2,h3,h4,h5,h6')){
        $topHeader = $el;
      }
      if($el[0] == $node[0]){
        break;
      }
    }
    return $topHeader;
  };

  SnippetModal.prototype.getFirstSnippetHeader = function(){
    return $('h1,h2,h3,h4,h5,h6', $('.snippets-preview .inner')).first();
  };

  SnippetModal.prototype.check508 = function(){
    var that = this;
    $('.portalMessage', that.modal.$modal).hide();

    // to check 508 compliance...
    // need to go through each header checking if it is nested properly
    var prevLevel = 1;
    var valid = true;
    $('h1,h2,h3,h4,h5,h6', $('.snippets-preview .inner')).each(function(){
      var level = parseInt(this.tagName[1]);
      if(level > (prevLevel + 1)){
        valid = false;
      }
    });
    if(!valid){
      $('.portalMessage', that.modal.$modal).show();
    }
  };

  SnippetModal.prototype.update = function(newSnippet){
    var that = this;
    var modal = that.modal;
    var data = that.re.$el.select2('data');
    if(data && data.length > 0){
      that.loadUID(data[0].UID, newSnippet);
    }else{
      // clear out
      $('.snippets-preview', modal.$modal).hide();
      $('.snippets-preview .inner', modal.$modal).empty();
      $('.insert-btn', modal.$modal).attr('disabled', 'true');
    }
  };

  SnippetModal.prototype.btnClicked = function($btn){
    var that = this;
    var $node = this.options.$node;
    var ed = this.options.editor;
    var modal = this.modal;

    $('.hidden-snippet', ed.getBody()).remove();

    if(!$btn.hasClass('insert-btn')){
      modal.hide();
      return;
    }

    var data = this.re.$el.select2('data');
    var indent = $('.snippets-indent select').val();

    if(data && data.length > 0){
      utils.loading.show();
      $.ajax({
        url: $('body').attr('data-base-url') + '/@@snippets-api',
        data: {
          uid: data[0].UID,
          action: 'code'
        }
      }).done(function(resp){
        var attrs = {
          class: 'snippet-tag snippet-tag-' + data[0].portal_type.toLowerCase().replace(' ', '-'),
          'data-type': 'snippet_tag',
          contenteditable: false,
          'data-snippet-id': data[0].UID,
          'data-snippet-indent': indent
        };

        ed.focus();
        ed.selection.setRng(that.rng);

        if($node){
          $node.attr(attrs);
          $node.text(resp.result);
        }else{
          ed.insertContent(ed.dom.createHTML('span', attrs, resp.result));
        }
      }).fail(function(){
        alert('Fehler beim Laden des Snippets');
      }).always(function(){
        utils.loading.hide();
      });
    }
    modal.hide();
  };

  var prefix = '[TID:';
  var suffix = ']';

  var TextEmbedModal = function(options){
    var that = this;

    that.options = options;

    var text = '';
    if(options.$node){
      text = options.$node.html();
      if(text.slice(0, 5) == prefix && text.slice(-1) == suffix){
        text = text.slice(5, -1);
      }
    }

    that.modal = new Modal(options.$el, {
      html: that.template({
        text: text
      }),
      content: null,
      buttons: '.plone-btn'
    });
    that.modal.on('shown', function() {
      that.init();
    });
  };

  TextEmbedModal.prototype.show = function(){
    this.modal.show();
  };

  TextEmbedModal.prototype.template = _.template('<div>' +
    '<h1>Text einbetten</h1>' +
    '<div class="field">' +
      '<div class="error" style="display:none"></div>' +
      '<div class="form-group text-content">' +
        '<label>Text ' +
        '<br/><span class="formHelp">Consists of textkeys only! If a textkey has parameters it is considered a textkey-structure. Values for all parameters in a textkey-structure must be listed, separated by "|". <br/>' +
        'A textkey may consist of characters, digits and "_". Values of parameters have the same constrains. <br/>' +
        'If more than one textkey is given each one must be surrounded by either "$textkey$" or "[TID:textkey]". ' +
        'Additionally these characters are allowed between textkeys: . : ; , - + < > <br/>' +
        'Examples: <br/>' +
        'guard{0}open|1 <br/>' +
        '$closingStation$ - $loadingSide$ <br/>' +
        '[TID:blisterStackTransfer] - [TID:slider{0}|1] - [TID:zAxis]</span>' +
        '</label>' +
        '<input type="text" value="<%= text %>" />' +
      '</div>' +
    '</div>' +
    '<button class="plone-btn plone-btn-default cancel-btn">Abbrechen</button>' +
    '<button class="plone-btn plone-btn-primary insert-btn">Einfügen</button>' +
  '</div>');

  TextEmbedModal.prototype.init = function(){
    var that = this;
    var modal = this.modal;

    $('button', modal.$modal).off('click').on('click', function(){
      var $btn = $(this);
      that.btnClicked($btn);
    });
  };

  TextEmbedModal.prototype.btnClicked = function($btn){
    var $node = this.options.$node;
    var ed = this.options.editor;
    var modal = this.modal;

    if(!$btn.hasClass('insert-btn')){
      modal.hide();
      return;
    }

    var text = $('.text-content input', modal.$modal).val().trim();

    // send input to validate-textsnippet for validation
    $.ajax({
      url: $('body').attr('data-base-url') + '/@@validate-textsnippet',
      data: { text: text }
    }).done(function(validationmsg){
      if(validationmsg == true){
        // valid: create textsnippet and close modal
        var attrs = {
          class: 'text-snippet-tag',
          'data-type': 'text_snippet_tag',
          contenteditable: false
        };
        text = prefix + text + suffix;
        if($node){
          $node.attr(attrs);
          $node.html(text);
        }else{
          ed.insertContent(ed.dom.createHTML('span', attrs, text));
        }
        modal.hide();
      }else{
        // invalid: display validation-message
        // handle case when a error was already shown.
        if (modal.$modal.find('div.field.error').length) {
            modal.$modal.find('div.field.error').removeClass('error');
            modal.$modal.find('div.error').text('')
        }
        var $errordiv = modal.$modal.find('div.error');
        modal.$modal.find('div.field').addClass('error');
        $errordiv.text(validationmsg);
        $errordiv.show();
        return
      }
    });
  };

  // tinymce plugins here!
  tinymce.create('tinymce.plugins.SnippetsPlugin', {

    init : function (ed) {

      ed.on('init', function(){
        // make all existing not editable
        $('[data-type="snippet_tag"]', ed.getBody()).each(function(){
          this.setAttribute('contenteditable', false);
        });
      });

      function openSnippetWindow($node) {
        var $el = $('<div/>');
        $('body').append($el);

        var modal = new SnippetModal({
          $node: $node,
          editor: ed,
          $el: $el
        });
        modal.show();
      }

      ed.addCommand('snippets', function () {
        var $el = $(ed.selection.getNode());
        if($el.is('[data-type="snippet_tag"]')){
          openSnippetWindow($el);
        }else{
          openSnippetWindow();
        }
      });

      function openTextSnippetWindow($node) {
        var $el = $('<div/>');
        $('body').append($el);

        var modal = new TextEmbedModal({
          $node: $node,
          editor: ed,
          $el: $el
        });
        modal.show();
      }

      ed.addCommand('textsnippets', function () {
        var $el = $(ed.selection.getNode());
        if($el.is('[data-type="text_snippet_tag"]')){
          openTextSnippetWindow($el);
        }else{
          openTextSnippetWindow();
        }
      });

      ed.addButton('snippetbutton', {
        cmd : 'snippets',
        image: $('body').attr('data-portal-url') + '/++resource++starzel.snippets/brackets.png'
      });

      ed.addButton('textsnippetbutton', {
        cmd : 'textsnippets',
        image: $('body').attr('data-portal-url') + '/++resource++starzel.snippets/text.png'
      });
    },
  });
  tinymce.PluginManager.add('snippets', tinymce.plugins.SnippetsPlugin);
}());
