# -*- coding: utf-8 -*-
from Products.CMFPlone.interfaces import INonInstallable
from zope.interface import implements


class HiddenProfiles(object):
    implements(INonInstallable)

    def getNonInstallableProfiles(self):
        """
        Prevents all profiles but 'default' from showing up in the
        profile list when creating a Plone site.
        """
        return [
            u'starzel.snippets:uninstall',
        ]


def setupVarious(context):
    if not context.readDataFile('starzel.snippets.marker.txt'):
        return
