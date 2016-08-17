# -*- coding: utf-8 -*-
from plone.registry.interfaces import IRegistry
from plone.uuid.interfaces import IUUID
from starzel.snippets.testing import BaseTest
from starzel.snippets.testing import SNIPPETS_INTEGRATION_TESTING
from starzel.snippets.transform import SnippetTransform
from zope.component import queryUtility


class TestTransform(BaseTest):

    layer = SNIPPETS_INTEGRATION_TESTING

    def _render_transform(self, page, indent=0):
        self.request.response.setHeader('Content-Type', 'text/html')
        transform = SnippetTransform(self.portal, self.request)
        html = '''<html>
<body>
<div data-type="snippet_tag" data-snippet-id="{}"
     data-snippet-indent="{}"></div>
</body>
</html>'''.format(IUUID(page), indent)

        return ''.join(transform.transformIterable(html, None))

    def test_replace_tag(self):
        page = self._create_page()
        self.assertTrue('<p>foobar</p>' in self._render_transform(page))

    def test_should_include_container(self):
        page = self._create_page()
        self.assertTrue('snippet-container-document' in self._render_transform(page))

    def test_should_include_data_attributes_on_source(self):
        page = self._create_page()
        result = self._render_transform(page)
        self.assertTrue('data-source-uid="' + IUUID(page) in result)

    def test_customize_render_expression(self):
        registry = queryUtility(IRegistry)
        registry['starzel.snippets.render_expression'] = u'context/Title'
        page = self._create_page()

        self.assertTrue('Test Snippet' in self._render_transform(page))

    def test_indent_render(self):
        page = self._create_page(text='''
<h1>Foobar 1</h1>
<p>foobar 1</p>
<h1>Foobar 2</h1>
<p>foobar 2</p>
<h2>Foobar 3</h2>
<p>foobar 3</p>
<h1>Foobar 4</h1>
<p>foobar 4</p>
''')

        result = self._render_transform(page, 2)
        self.assertTrue('<h3>Foobar 1' in result)
        self.assertTrue('<h3>Foobar 2' in result)
        self.assertTrue('<h4>Foobar 3' in result)
        self.assertTrue('<h3>Foobar 4' in result)
