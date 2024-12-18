
# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))
import sphinx_rtd_theme


# -- Project information -----------------------------------------------------

project = 'EarthScope Cloud Documentation'
copyright = '2024, EarthScope Consortium'
author = 'EarthScope Consortium'

# The full version, including alpha/beta/rc tags
release = '0.0.0'

# -- General configuration ---------------------------------------------------

# Default in Sphinx 2, but not in older versions
master_doc = 'index'

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
  "sphinx_rtd_theme"
]

# # Add any paths that contain templates here, relative to this directory.
# templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
# exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'sphinx_rtd_theme'
html_theme_options = {
    'logo_only': True,
    'display_version': False,
    'sticky_navigation': False,
}

html_logo='_static/ESC_Logo-primary_color_HR.png'
html_favicon = '_static/earthscope_favicon_color.png'
html_title = 'EarthScope Cloud Documentation'
html_show_sphinx = False
html_search_language = 'en'

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
# html_static_path = ['_static']

# html_css_files = [
#   'css/fdsn_rtd_theme.css',
# ]