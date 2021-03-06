/* PlaylistPlayerView
 *
 * Handles playing videos continulously from a playlist
 */

(function (exports) {
    "use strict";

    /**
     * @class PlaylistPlayerView
     * @description Handles playing videos continulously from a playlist
     */
    var PlaylistPlayerView = function (settings) {
        // mixin inheritance, initialize this as an event handler for these events:
        Events.call(this, ['exit', 'videoStatus', 'indexChange']);

        this.currentPlayerView = null;
        this.preloadedPlayerView = null;
        this.currentIndex = null;
        this.items = null;
        this.$el = null;
        this.settings = settings;
        this.currentView = null;
        this.PlayerView = settings.PlayerView;
        this.previewShowing = false;
        this.previewDismissed = false;
        this.$previewEl = null;
        this.$countdown_text = null;
        this.previewTime = settings.previewTime;
        this.timeTillPlay = null;

        this.PREVIEW_TIME_DEFAULT = 10;

        this.remove = function () {
            if (this.currentPlayerView) {
                this.currentPlayerView.remove();
            }
            if (this.preloadedPlayerView) {
                this.preloadedPlayerView.remove();
            }
        };

        /**
         * Initial function to setup and start the playlist of media
         */
        this.render = function($el, items, startIndex) {
            if (!this.previewTime) {
                this.previewTime = this.PREVIEW_TIME_DEFAULT;
            }
            this.$el = $el;
            this.currentPlayerView = new this.PlayerView(this.settings);
            this.currentPlayerView.render($el, items, startIndex);

            this.currentPlayerView.on('exit', this.exit, this);

            this.currentIndex = startIndex;
            this.items = items;

            this.currentPlayerView.on('videoStatus', this.handleVideoStatus, this)

            this.currentView = this.currentPlayerView;

            //touch events
            touches.registerTouchHandler("player-content-video", this.handleTouchPlayer);
            touches.registerTouchHandler("player-controls-container", this.handleTouchPlayer);
            touches.registerTouchHandler("player-back-button", this.handleTouchPlayer);
            touches.registerTouchHandler("player-pause-indicator", this.handleTouchPlayer);

            this.setUpNextPlayer();
        };

       /**
        * Handle Touch events for the player
        * @param {Event} e
        */
        this.handleTouchPlayer = function(e) {
            if(e.target.className === "player-back-button") { //back button
                this.currentView.handleControls({type : "touch", keyCode : buttons.BACK});
            } else { 
                this.currentView.handleControls({type : "touch", keyCode : buttons.PLAY_PAUSE});
            }
        }.bind(this);

        /**
         * Handles shwoing the view to transition from playing one video to the next
         */
        this.transitionToNextVideo = function() {
            if (this.preloadedPlayerView) {
                if (this.$previewEl) {
                    this.$previewEl.remove();
                }
                this.currentIndex += 1;
                this.currentPlayerView.remove();
                this.previewShowing = false;
                this.previewDismissed = false;
                this.trigger("indexChange", this.currentIndex);
                this.startNextVideo();
            }
            else {
                this.exit();
            }
        };

        this.showTransitionView = function () {
            if (this.preloadedPlayerView) {
                this.previewShowing = true;
                var html = utils.buildTemplate($("#next-video-view-template"), this.items[this.currentIndex + 1]);
                this.$el.append(html);
                this.$previewEl = this.$el.children().last();
                this.$countdown_text = this.$previewEl.find(".next-video-starttext");
                this.$countdown_text.text("" + this.previewTime);
            }
        }

        /**
         * Helper function to set up the next player
         */
        this.setUpNextPlayer = function () {
            if (this.items.length > this.currentIndex + 1) {
                this.preloadedPlayerView = new this.PlayerView(settings);
                this.preloadedPlayerView.render(this.$el, this.items, this.currentIndex + 1);
                this.preloadedPlayerView.hide();
            }
        }

        /**
         * @function handleVideoStatus
         * @description status handler for video status events to convert them into showing correct controls
         */
        this.handleVideoStatus = function(currentTime, duration, type) {       
            if (type === "playing") {
                if (this.previewShowing) {
                    this.timeTillPlay = Math.round((duration - currentTime));
                    this.$countdown_text.text("" + this.timeTillPlay);
                }
                else if (duration - currentTime <= this.previewTime) {
                    this.showTransitionView();
                }
            }

            if (type === "ended") {
                this.transitionToNextVideo();
            }
            else {
                this.trigger('videoStatus', currentTime, duration, type);
            }
        }.bind(this);
        
        /**
         * Cleanup and exit the playlist/player/next video view
         */
        this.exit = function() { 
            this.trigger("exit");
        }

        this.playVideo = function() {
            this.currentPlayerView.playVideo();
        }
        /**
         * start the next video after the transition view is complete
         */
        this.startNextVideo = function () {
            this.currentPlayerView.remove();
            this.currentPlayerView = this.preloadedPlayerView;
            this.preloadedPlayerView = null;

            this.currentPlayerView.on('videoStatus', this.handleVideoStatus, this)
            this.setUpNextPlayer();
            this.currentView = this.currentPlayerView;
            this.currentPlayerView.show();
            if (this.currentPlayerView.canplay) {
                this.currentPlayerView.playVideo();
            }

            this.currentPlayerView.on('exit', this.exit, this);
        }

       /**
        * Check to see if we have a seek action
        * @param {Number} key the keyCode of the event
        * @return {Boolean}
        */
        this.seekAction = function(key) {
             if(key === buttons.UP || key === buttons.DOWN || key === buttons.LEFT || 
                key === buttons.RIGHT || key === buttons.FAST_FORWARD || key === buttons.REWIND) {

                 return true;
             }
             return false;
        }

        // handle button events, send them to the current playlist view that is selected.
        this.handleControls = function (e) {
            if (this.currentView) {
                if (this.previewShowing && !this.previewDismissed && !this.seekAction(e.keyCode)) {
                    switch (e.keyCode) {
                        case buttons.BACK:
                            this.$previewEl.remove();
                            this.previewDismissed = true;
                            break;
                        case buttons.SELECT:
                            this.transitionToNextVideo();
                            break;
                        case buttons.PLAY_PAUSE:
                            this.currentView.handleControls(e);
                            break;
                    }
                }
                else {
                    this.currentView.handleControls(e);
                }
            }
        }.bind(this);
    }

    exports.PlaylistPlayerView = PlaylistPlayerView;
}(window));
