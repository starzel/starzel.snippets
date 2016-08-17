.. raw::html

==============
starzel.snippets
==============

(Plone 5.0+)

Introduction
------------
This is a fork of the uwosh.snippets package.


What is does
------------

The primary use-case for this package is to allow users to selection indentation
level of headings on the snippets.

What is a snippet?
------------------
Technically speaking, a snippet is just an ordinary chunk of rich-text that can be repeatedly
inserted into a Plone page wherever you like. However, unlike templates, copy/paste, or other
similar methods, snippets are dynamic. Instead of a bunch of text that is dumped onto a page at
edit time, a snippet is simply a pointer to a single instance of text that is stored elsewhere.
Since the placeholders (referred to as "plugs") are being stored on the page, instead of the
text they represent, they never need to be updated. You simply just edit the snippet "definition"
and immediately the changes will be propagated everywhere that you have a plug in your website.


How to use
----------
In order to use the starzel.snippets add-on, the TinyMCE WYSIWYG editor needs to be installed
and enabled. A basic understanding of its use is also highly recommended. For more information
about TinyMCE, visit their `website <http://www.tinymce.com>`_.


TODO
----

- would be nice: re-add support for add/edit/delete snippets in the modal
  - doesn't fit as well into how we're allowing snippets from anywhere on the site now
