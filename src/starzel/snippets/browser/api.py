from plone.uuid.interfaces import IUUID
from plone.app.uuid.utils import uuidToObject
from plone.registry.interfaces import IRegistry
from Products.CMFCore.Expression import Expression
from Products.Five import BrowserView
from starzel.snippets.utils import ExpressionEvaluator
from starzel.snippets.utils import render_snippet
from zope.component import getUtility
from lxml.html import fromstring, tostring
from starzel.snippets.transform import SnippetTransform

import json


class SnippetsAPI(BrowserView):
    """
    Web API
    """

    def __call__(self):
        self.request.response.setHeader('Content-type', 'application/json')

        action = self.request.form.get('action')
        if action == 'code':
            data = self.get_code()
        elif action == 'render':
            data = self.get_rendered()
        elif action == 'transform':
            data = self.get_transformed()
        elif action == 'configuration':
            data = self.get_configuration()

        return json.dumps(data)

    def get_configuration(self):
        registry = getUtility(IRegistry)

        return {
            'relatedItemsOptions': registry.get('starzel.snippets.related_items_options'),
            'uid': IUUID(self.context, None)
        }

    def get_transformed(self):
        html = self.request.form.get('html').decode('utf8')
        transform = SnippetTransform(self.context, self.request)
        dom = fromstring(html)
        transform.transformSnippets(dom)
        transform.transformTextSnippets(dom)
        return {
            'success': True,
            'result': tostring(dom)
        }

    def get_rendered(self):
        uid = self.request.form.get('uid')
        ob = uuidToObject(uid)
        try:
            indent = int(self.request.form.get('indent', 0))
        except:
            indent = 0
        return {
            'success': True,
            'result': render_snippet(ob, indent),
            'indent': indent
        }

    def get_code(self):
        uid = self.request.form.get('uid')

        registry = getUtility(IRegistry)
        ob = uuidToObject(uid)
        evaluator = ExpressionEvaluator()
        expression = Expression(registry.get('starzel.snippets.code_display_expression',
                                             'string:Snippet:[ID=${context/@@uuid}]'))

        return {
            'success': True,
            'result': evaluator.evaluate(expression, ob, uid=uid)
        }
