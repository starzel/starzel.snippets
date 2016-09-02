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
  });


  var SnippetModal = function(options){
    var that = this;

    that.options = options;

    var uid = '';
    // force loading existing value if something selected
    if(options.$node){
      uid = options.$node.attr('data-snippet-id');
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
    '<h1>Add snippet</h1>' +
    '<div>' +
      '<div class="form-group snippets-content">' +
        '<label>Select content</label>' +
        '<input class="pat-relateditems" type="text" value="<%= uid %>"' +
              " data-pat-relateditems='<%= reOptions %>' />" +
      '</div>' +
      '<div class="form-group snippets-indent">' +
        '<label>Indentation Level</label>' +
        '<select>' +
          '<option value="0">0</option>' +
          '<option value="1">1</option>' +
          '<option value="2">2</option>' +
          '<option value="3">3</option>' +
          '<option value="4">4</option>' +
          '<option value="5">5</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="portalMessage warning" style="display:none">' +
      '<strong>Warning</strong>' +
        'The header structure you have selected is not 508 compliant' +
    '</div>' +
    '<div class="snippets-preview" style="display: none">' +
      '<h2>Snippet Preview</h2>' +
      '<div class="inner"></div>' +
    '</div>' +
    '<button class="plone-btn plone-btn-default cancel-btn">Cancel</button>' +
    '<button class="plone-btn plone-btn-primary insert-btn" disabled="true">Insert</button>' +
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
      that.update();
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

  SnippetModal.prototype.loadUID = function(uid){
    var that = this;
    var modal = that.modal;

    utils.loading.show();
    $.ajax({
      url: API_URL,
      data: {
        uid: uid,
        action: 'render',
        indent: this.getIndentLevel()
      }
    }).done(function(data){
      $('.insert-btn', modal.$modal).removeAttr('disabled');
      var $els = $('<div>' + data.result + '</div>');
      $('.snippets-preview', modal.$modal).show();
      $('.snippets-preview .inner', modal.$modal).empty().append($els);

      if(!that.options.$node){
        that.guessHeaderLevel();
      }

      that.check508();
      that.addHeaderAnnotations();
    }).fail(function(){
      alert('error loading snippet data');
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
    if(topHeaderLevel > snippetHeaderLevel){
      $('.snippets-indent select', this.modal.$modal).val(topHeaderLevel - snippetHeaderLevel);
    }
  };

  SnippetModal.prototype.addHeaderAnnotations = function(){
    // add h1 -> h3 info on each header
    var indent = this.getIndentLevel();
    $('h1,h2,h3,h4,h5,h6', $('.snippets-preview .inner')).each(function(){
      var $el = $(this);
      var current = parseInt($el[0].tagName[1]);
      $el.prepend($(
        '<div class="annotation">' +
          '<span class="from">H' + (current - indent) + '</span>' +
          '<span class="sep"> ➔ </span>' +
          '<span class="to">H' + current + '</span>' +
        '</div>'));
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
    // need to get closest prior header
    // and first header in output
    var $topHeader = that.getClosestContentHeader();
    var $snippetHeader = that.getFirstSnippetHeader();

    if($topHeader.length === 0 || $snippetHeader.length === 0){
      return;
    }
    var topHeaderLevel = parseInt($topHeader[0].tagName[1]);
    var snippetHeaderLevel = parseInt($snippetHeader[0].tagName[1]);
    if(snippetHeaderLevel > (topHeaderLevel + 1)){
      $('.portalMessage', that.modal.$modal).show();
    }
  };

  SnippetModal.prototype.update = function(){
    var that = this;
    var modal = that.modal;
    var data = that.re.$el.select2('data');
    if(data && data.length > 0){
      that.loadUID(data[0].UID);
    }else{
      // clear out
      $('.snippets-preview', modal.$modal).hide();
      $('.snippets-preview .inner', modal.$modal).empty();
      $('.insert-btn', modal.$modal).attr('disabled', 'true');
    }
  };

  SnippetModal.prototype.btnClicked = function($btn){
    var $node = this.options.$node;
    var ed = this.options.editor;
    var modal = this.modal;

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
        if($node){
          $node.attr(attrs);
          $node.text(resp.result);
        }else{
          ed.insertContent(ed.dom.createHTML('span', attrs, resp.result));
        }
      }).fail(function(){
        alert('error loading snippet data');
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
    '<h1>Add text</h1>' +
    '<div>' +
      '<div class="form-group text-content">' +
        '<label>Enter content</label>' +
        '<input type="text" value="<%= text %>" />' +
      '</div>' +
    '</div>' +
    '<button class="plone-btn plone-btn-default cancel-btn">Cancel</button>' +
    '<button class="plone-btn plone-btn-primary insert-btn">Insert</button>' +
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

    var text = $('.text-content input', modal.$modal).val();
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
