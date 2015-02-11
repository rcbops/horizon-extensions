try:
    from django.conf.urls.defaults import patterns, url
except ImportError:  # Django 1.6
    from django.conf.urls import patterns, url

from rackspace.heat_store.views import (IndexView, LaunchView, SolutionsView)

urlpatterns = patterns('',
                       url(r'^$', IndexView.as_view(), name='index'),
                       url(r'^launch/(?P<template_id>.+)$',
                           LaunchView.as_view(),
                           name='launch'),
                       url(r'^solutions$', 
                           SolutionsView.as_view(), 
                           name='solutions'),
                       url(r'^solutions/(?P<template_id>.+)$', 
                           SolutionsView.as_view(), 
                           name='solutions'),                       
                       )
