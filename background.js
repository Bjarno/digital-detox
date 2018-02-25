const ImpulseBlocker = {

    /**
     * Global variables
     */
    currentStatus: 'on',

    /**
     * Generic error logger.
     */
    onError: (event) => {
        console.error(event);
    },

    /**
     * Starts the blocker. Adds a listener so that if new websites is added
     * to the blocked list the listener is refreshed.
     */
    init: () => {
        const handlingSites = browser.storage.local.get('sites').then((storage) => {
            if (typeof storage.sites === 'undefined') {
                return browser.storage.local.set({
                    'sites': [],
                });
            }
        });

        handlingSites.then(ImpulseBlocker.setBlocker, ImpulseBlocker.onError);
    },

    /**
     * Redirects the tab to local "You have been blocked" page.
     */
    redirect: (requestDetails) => {
        browser.tabs.update(requestDetails.tabId, {
            url: '/redirect.html?from=' + requestDetails.url
        });
    },

    /**
     * Returns the current status of the extension.
     */
    getStatus: () => ImpulseBlocker.currentStatus,

    /**
     * Sets the current status of the extension.
     * @param string status
     */
    setStatus: (status) => {
        ImpulseBlocker.currentStatus = status;
        if (status === 'on') {
            var icon = 'icons/icon-96.svg';
        } else {
            var icon = 'icons/icon-96-disabled.svg';
        }
        browser.browserAction.setIcon({
            path: icon
        });
    },

    /**
     * Fetches blocked websites lists, attaches them to the listener provided
     * by the WebExtensions API.
     */
    setBlocker: () => {
        browser.storage.local.get('sites').then((storage) => {
            const pattern = storage.sites.map(item => `*://*.${item}/*`);

            browser.webRequest.onBeforeRequest.removeListener(ImpulseBlocker.redirect);
            if (pattern.length > 0) {
                browser.webRequest.onBeforeRequest.addListener(
                    ImpulseBlocker.redirect, {
                        urls: pattern,
                        types: ['main_frame']
                    }, ['blocking'],
                );
            }
        });

        browser.storage.onChanged.addListener(() => {
            // if the extension off we should not be bothered by restarting with new list
            if (ImpulseBlocker.getStatus() === 'on') {
                ImpulseBlocker.setBlocker();
            }
        });

        ImpulseBlocker.setStatus('on');
    },

    /**
     * Removes the web request listener and turns the extension off.
     */
    disableBlocker: () => {
        browser.webRequest.onBeforeRequest.removeListener(ImpulseBlocker.redirect);
        ImpulseBlocker.setStatus('off');
    },

    /**
     * Add a website to the blocked list
     * @param  {string} url Url to add to the list
     */
    addSite: (url) => {
        browser.storage.local.get('sites').then((storage) => {
            storage.sites.push(url);
            browser.storage.local.set({
                'sites': storage.sites,
            });
        });
    },

    /**
     * Add a website to the blocked list
     * @param  {string} url Url to remove to the list
     */
    removeSite: (url) => {
        browser.storage.local.get('sites').then((storage) => {
            const i = storage.sites.indexOf(url);
            if (i !== -1) {
                storage.sites.splice(i, 1);
            }
            browser.storage.local.set({
                'sites': storage.sites,
            });
        });
    },
};

ImpulseBlocker.init();

// Helper functions to access object literal from popup.js file. These funcitons are
// easily accessible from the getBackgroundPage instance.
function getStatus() {
    return ImpulseBlocker.getStatus();
}

function disableBlocker() {
    ImpulseBlocker.disableBlocker();
}

function setBlocker() {
    ImpulseBlocker.setBlocker();
}

function getDomain() {
    return browser.tabs.query({
        active: true,
        currentWindow: true
    });
}

function getSites() {
    return browser.storage.local.get('sites');
}

function addCurrentlyActiveSite() {
    const gettingActiveTab = browser.tabs.query({
        active: true,
        currentWindow: true
    });
    return gettingActiveTab.then((tabs) => {
        const url = new URL(tabs[0].url);
        ImpulseBlocker.addSite(url.hostname.replace(/^www\./, ''));
    });
}

function removeCurrentlyActiveSite() {
    const gettingActiveTab = browser.tabs.query({
        active: true,
        currentWindow: true
    });
    return gettingActiveTab.then((tabs) => {
        const url = new URL(tabs[0].url);
        ImpulseBlocker.removeSite(url.hostname.replace(/^www\./, ''));
    });
}
