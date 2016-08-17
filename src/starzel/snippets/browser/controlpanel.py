from plone.app.registry.browser import controlpanel
from starzel.snippets.interfaces import ISnippetsSettings


class SnippetsControlPanelForm(controlpanel.RegistryEditForm):
    schema = ISnippetsSettings
    schema_prefix = 'starzel.snippets'
    id = "SnippetsControlPanel"
    label = u"Snippets Settings"
    description = ""


class SnippetsControlPanel(controlpanel.ControlPanelFormWrapper):
    form = SnippetsControlPanelForm
