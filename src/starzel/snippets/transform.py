# -*- coding: utf-8 -*-
from Acquisition import aq_parent
from lxml import etree
from lxml.html import fromstring
from plone import api
from plone.app.uuid.utils import uuidToObject
from plone.registry.interfaces import IRegistry
from plone.transformchain.interfaces import ITransform
from plone.uuid.interfaces import IUUID
from Products.CMFCore.Expression import Expression
from repoze.xmliter.utils import getHTMLSerializer
from starzel.snippets.interfaces import ISnippetsLayer
from starzel.snippets.utils import apply_indentation
from starzel.snippets.utils import ExpressionEvaluator
from zope.component import adapts
from zope.component import getUtility
from zope.interface import implements
from zope.interface import Interface

import types


def u(val):
    if not isinstance(val, unicode):
        try:
            return val.decode('utf8')
        except UnicodeDecodeError:
            return val
    return val


class SnippetTransform(object):
    implements(ITransform)
    adapts(Interface, ISnippetsLayer)

    order = 9000

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def transformBytes(self, result, encoding):
        return result

    def transformUnicode(self, result, encoding):
        return result

    def transformSnippets(self, root):
        site = api.portal.get()
        site_path = '/'.join(site.getPhysicalPath())
        rendered = {}

        registry = getUtility(IRegistry)

        evaluator = ExpressionEvaluator()
        expression = Expression(registry.get('starzel.snippets.render_expression',
                                             'context/text/output|context/getText|nothing'))

        for el in root.cssselect('[data-type="snippet_tag"]'):
            snippet_name = el.attrib.get('data-snippet-id')
            try:
                indent = int(el.attrib.get('data-snippet-indent', 0))
            except:
                indent = 0
            if snippet_name not in rendered:
                ob = uuidToObject(snippet_name)
                if ob is None:
                    ob = site.restrictedTraverse('.snippets/' + snippet_name, None)
                if ob is not None:
                    rendered[snippet_name] = {
                        'html': evaluator.evaluate(expression, ob),
                        'ob': ob
                    }

            if snippet_name in rendered:
                data = rendered[snippet_name]
                ob = data['ob']
                val = data['html']

                if indent != 0:
                    val = apply_indentation(val, indent)

                snippet_container = etree.Element('div')

                className = 'snippet-container snippet-container-{}'.format(
                    ob.portal_type.lower().replace(' ', '-')
                )

                if not val:
                    val = '<p>Snippet could not be found</p>'
                    className += ' snippet-container-missing'

                snippet_container.attrib.update({
                    'class': u(className),
                    'data-source-uid': u(IUUID(ob, None) or ''),
                    'data-source-id': u(ob.getId()),
                    'data-source-title': u(ob.Title()),
                    'data-source-indent': unicode(indent),
                    'data-source-path': u('/'.join(ob.getPhysicalPath())[len(site_path):])
                })

                content_el = fromstring(val)
                if content_el.tag == 'div':
                    # unwrap: fromstring auto adds div around content so we'll just take the
                    # inside of it instead
                    for inside_el in content_el:
                        snippet_container.append(inside_el)
                else:
                    snippet_container.append(content_el)

                if val:
                    parent = el.getparent()
                    idx = parent.index(el)
                    parent[idx] = snippet_container

    def transformTextSnippets(self, root):
        context = self.getContext()

        for el in root.cssselect('[data-type="text_snippet_tag"]'):
            try:
                el.text = el.text.format(**{
                    'title': context.Title()
                })
            except KeyError:
                pass

    def getContext(self):
        published = self.request.get('PUBLISHED')
        if isinstance(published, types.MethodType):
            return published.im_self
        return aq_parent(published)

    def transformIterable(self, result, encoding):
        if self.request['PATH_INFO'].endswith('edit'):
            return result

        contentType = self.request.response.getHeader('Content-Type')
        if contentType is None or not contentType.startswith('text/html'):
            return None

        ce = self.request.response.getHeader('Content-Encoding')
        if ce and ce in ('zip', 'deflate', 'compress'):
            return None
        try:
            if result == ['']:
                return None

            result = getHTMLSerializer(result, pretty_print=False)
        except (TypeError):
            return None

        root = result.tree.getroot()
        self.transformSnippets(root)
        self.transformTextSnippets(root)

        return result
