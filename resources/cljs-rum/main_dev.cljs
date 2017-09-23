(ns ^:figwheel-no-load env.$PLATFORM$.main
  (:require [$PROJECT_NAME_HYPHENATED$.$PLATFORM$.core :as core]
            [figwheel.client :as figwheel :include-macros true]))

(assert (exists? core/init) "Fatal Error - Your core.cljs file doesn't define an 'init' function!!! - Perhaps there was a compilation failure?")
(assert (exists? core/app-root) "Fatal Error - Your core.cljs file doesn't define an 'app-root' function!!! - Perhaps there was a compilation failure?")

(enable-console-print!)

(figwheel/watch-and-reload
  :websocket-url "ws://localhost:3449/figwheel-ws"
  :heads-up-display false
  ;; TODO make this Rum something
  :jsload-callback #(#'core/mount-app))

(core/init)


;; Do not delete, root-el is used by the figwheel-bridge.js
(def root-el (core/root-component-factory))
