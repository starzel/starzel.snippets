from setuptools import setup, find_packages
import os

version='1.0.0dev0'

long_description = (
    open('README.rst').read()
    + '\n' +
    'Contributors\n'
    '============\n'
    + '\n' +
    open('CONTRIBUTORS.txt').read()
    + '\n' +
    open('CHANGES.txt').read()
    + '\n')

setup(name='starzel.snippets',
      version=version,
      description="Adds dynamic rich-text snippets",
      long_description=long_description,
      # Get more strings from
      # http://pypi.python.org/pypi?%3Aaction=list_classifiers
      classifiers=[
        "Environment :: Web Environment",
        "Framework :: Plone",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 2.6",
        "Topic :: Software Development :: Libraries :: Python Modules",
        ],
      keywords='',
      author='Sam Schwartz',
      author_email='obct537@gmail.com',
      url='https://github.com/starzel/starzel.snippets',
      license='gpl',
      namespace_packages=['starzel',],
      package_dir={'' : 'src'},
      packages=find_packages('src'),
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
    	  'plone.directives.form',
          'plone.api',
          'lxml',
          'z3c.unconfigure',
          'plone.app.linkintegrity'
          # -*- Extra requirements: -*-
      ],
      extras_require={'test': ['plone.app.testing']},
      entry_points="""
      # -*- Entry points: -*-
      [z3c.autoinclude.plugin]
      target = plone
      """,
      )
