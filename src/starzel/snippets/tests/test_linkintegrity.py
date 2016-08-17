# -*- coding: utf-8 -*-
from zope.annotation.interfaces import IAnnotations
from Products.statusmessages import STATUSMESSAGEKEY
from plone.app.textfield.value import RichTextValue
from plone.app.linkintegrity.utils import getIncomingLinks, getOutgoingLinks
from plone.uuid.interfaces import IUUID
from starzel.snippets.linkintegrity import getSnippetRefs
from starzel.snippets.testing import BaseTest
from starzel.snippets.testing import SNIPPETS_INTEGRATION_TESTING


class TestTransform(BaseTest):

    layer = SNIPPETS_INTEGRATION_TESTING

    def test_get_ref_form_snippet(self):
        page1 = self._create_page(_id='test1')
        page2 = self._create_page(
            text='<div data-type="snippet_tag" data-snippet-id="{}"</div>'.format(
                IUUID(page1)
            ))
        refs = getSnippetRefs(page2)
        self.assertEqual([i for i in refs][0].to_object.getId(), 'test1')
        # should also have stored these refs for object
        links = getOutgoingLinks(page2)
        self.assertEqual([l for l in links][0].to_object.getId(), 'test1')
