/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Paul Gingrich - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.widget = gc.widget || {};
gc.widget.internal = gc.widget.internal || {};

(function()
{

    gc.widget.internal.StatusIndicator = function(targetWidget, locationHint)
    {
        this.messages =
        {
            error : [],
            warning : [],
            information : []
        };
        this.targetWidget = targetWidget;
        this.locationHint = locationHint;
    };

    gc.widget.internal.StatusIndicator.prototype = new gc.widget.IStatusIndicator();

    var addVisibleListener = function(targetWidget, statusWidget)
    {
        var observer = new MutationObserver(function(mutations)
        {
            mutations.forEach(function(mutation)
            {
                if (targetWidget.style.display === 'none' || targetWidget.style.visibility === 'hidden')
                {
                    statusWidget.style.visibility = 'hidden';
                }
                else
                {
                    statusWidget.style.visibility = 'visible';
                }
            });
        });
        observer.observe(targetWidget,
        {
            attributes : true,
            attributeFilter :
            [
                'style'
            ]
        });
        return observer;
    };

    var createStatusWidget = function(elem, message, type, locationHint)
    {
        var parentElem = Polymer.dom ? Polymer.dom(elem).parentNode : elem.parentElement;
        var elemStyle = getComputedStyle(elem);
        var positionStyle = elemStyle.position;
        var styles = null;
        if (parentElem && positionStyle)
        {
            var div = document.createElement('div');
            if (positionStyle === 'absolute')
            {
                // calculate relative size and position in pixels w.r.t parent
                // element.
                var elemRect =
                {
                    left : elem.offsetLeft,
                    right : elem.clientWidth + elem.offsetLeft,
                    top : elem.offsetTop,
                    bottom : elem.clientHeight + elem.offsetTop
                };

                // set styles including position
                styles = getRelativeIndicatorPosition(elemRect, locationHint);
                styles.divStyle = 'position: absolute; ' + styles.divStyle;
            }
            else if (positionStyle === 'static' || positionStyle === 'relative')
            {
                styles =
                {
                    divStyle : 'position: relative; ',
                    imgStyle : 'left: 0px; top: 0px;'
                };
            }
            else
            // 'fixed'
            {
                styles = getRelativeIndicatorPosition(elem.getBoundingClientRect(), locationHint);
                styles.divStyle = 'position: fixed; ' + styles.divStyle;
            }
            div.setAttribute('style', styles.divStyle + 'overflow: visible; display: inline-block');

            var img = document.createElement('img');
            img.src = getStatusIndicatorIcon(type, elem);
            img.setAttribute('style', 'position: absolute; width: 0.8em; height: 0.8em; z-index:275;' + styles.imgStyle);
            img.setAttribute('title', message);

            div.appendChild(img);
            if (gc && !gc.designer)
            {
                // don't show status indicators in designer, because the
                // indicator becomes part of the gist.
                parentElem.insertBefore(div, elem);
            }

            return div;
        }
        return null;
    };

    gc.widget.internal.StatusIndicator.prototype.addMessage = function(newMessage, type)
    {
        type = type || gc.widget.StatusIndicatorType.ERROR;
        if (newMessage && newMessage.length > 0)
        {
            this.removeMessage(newMessage, true);
            this.messages[type].push(newMessage);

            if (this.statusWidget)
            {
                updateStatusIndication(getStatusMessage(this.messages), this.statusWidget);
            }
            else
            {
                this.statusWidget = createStatusWidget(this.targetWidget, newMessage, type, this.locationHint);
                if (this.statusWidget)
                {
                    this.visibilityObserver = addVisibleListener(this.targetWidget, this.statusWidget);
                }
            }
        }
    };

    var updateStatusIndication = function(nextMessage, statusWidget)
    {
        if (statusWidget && nextMessage)
        {
            var img = statusWidget.children[0];
            if (img && img.title != nextMessage.message)
            {
                // update the status text with new message.
                img.title = nextMessage.message;
                var iconLocation = getStatusIndicatorIcon(nextMessage.type);
                if (img.src.indexOf(iconLocation) < 0)
                {
                    img.src = iconLocation;
                }
            }
        }
    };

    var statusTypes =
    [
        gc.widget.StatusIndicatorType.ERROR, gc.widget.StatusIndicatorType.WARNING, gc.widget.StatusIndicatorType.INFO
    ];
    var getStatusMessage = function(messages)
    {
        var newMessage;

        for (var i = 0; i < statusTypes.length; i++)
        {
            var statusType = statusTypes[i];
            var messageList = messages[statusType];
            if (messageList && messageList.length > 0)
            {
                return (
                {
                    message : messageList[messageList.length - 1],
                    type : statusType
                });
            }
        }
        return null;
    };

    gc.widget.internal.StatusIndicator.prototype.removeMessage = function(oldMessage, preventUpdate)
    {
        if (!oldMessage || oldMessage.length === 0)
        {
            return;
        }

        for (var i = 0; i < statusTypes.length; i++)
        {
            var statusType = statusTypes[i];
            var messageList = this.messages[statusType];
            for (var j = messageList.length; j-- > 0;)
            {
                if (messageList[j] === oldMessage)
                {
                    messageList.splice(j, 1);

                    if (!preventUpdate)
                    {
                        var nextMessage = getStatusMessage(this.messages);
                        if (nextMessage)
                        {
                            updateStatusIndication(nextMessage, this.statusWidget);
                        }
                        else
                        // no more status messages, so lets get rid or the
                        // status indicator widget.
                        {
                            var parentElem = this.statusWidget && this.statusWidget.parentElement;
                            if (parentElem)
                            {
                                parentElem.removeChild(this.statusWidget);
                            }
                            if (this.visibilityObserver)
                            {
                                this.visibilityObserver.disconnect();
                            }
                            this.visibilityObserver = undefined;
                            this.statusWidget = undefined;
                        }
                    }
                }
            }
        }
    };

    var getRelativeIndicatorPosition = function(rect, hint)
    {
        hint = hint || 'middle-left';
        var divStyle = "";
        var imgStyle = "";
        var edge = false;

        var fields = hint.split('-');
        if (fields.length != 2)
        {
            fields =
            [
                'left', 'middle'
            ];
        }
        for (var i = 0; i < 2; i++)
        {
            switch (fields[i].trim().toLowerCase())
            {
                // horizontal positions
                case 'left':
                    divStyle += 'left: ' + rect.left + 'px; ';
                    imgStyle += (edge ? 'left: 0px; ' : 'right: 0px; ');
                    edge = true;
                    break;
                case 'right':
                    divStyle += 'left: ' + rect.right + 'px; ';
                    imgStyle += (edge ? 'right :0px;' : 'left :0px; ');
                    edge = true;
                    break;
                case 'center':
                    divStyle += 'left: ' + (rect.left + rect.right) / 2 + 'px; ';
                    imgStyle += 'left: -0.4em; ';
                    break;
                // vertical positions
                case 'top':
                    divStyle += 'top: ' + rect.top + 'px; ';
                    imgStyle += (edge ? 'top: 0px; ' : 'bottom: 0px; ');
                    edge = true;
                    break;
                case 'bottom':
                    divStyle += 'top: ' + rect.bottom + 'px; ';
                    imgStyle += (edge ? 'bottom: 0px;' : 'top: 0px; ');
                    edge = true;
                    break;
                case 'middle':
                    divStyle += 'top: ' + (rect.top + rect.bottom) / 2 + 'px; ';
                    imgStyle += 'top: -0.4em; ';
                    break;
                default:
                    ti_logger.error(gc.databind.name, 'Invalid position found in status indicator location hint = ' + hint);
                    break;
            }
        }
        return (
        {
            divStyle : divStyle,
            imgStyle : imgStyle
        });
    };

    var getStatusIndicatorIcon = function(type, elem)
    {
        var result = 'components/ti-core-databind/images/' + type + '.png';
        var widget = document.querySelector('ti-core-stylesheets') || elem;
        if (widget) {
            result = widget.resolveUrl('../ti-core-databind/images/' + type + '.png');
        }
        return encodeURI(result);
    };

    var activeStatusIndicators = {};
    gc.widget.internal.StatusIndicator.factory =
    {
        get : function(widget)
        {
            var statusIndicator = activeStatusIndicators[widget.id];
            if (statusIndicator === undefined)
            {
                if (widget)
                {
                    var locationHint = widget._statusIndicatorLocationHint;
                    if (locationHint && typeof locationHint === 'function')
                    {
                        locationHint = locationHint.call(widget);
                    }
                    statusIndicator = new gc.widget.internal.StatusIndicator(widget, locationHint);
                    activeStatusIndicators[widget.id] = statusIndicator;
                }
            }
            else
            {
                // update target widget in case it has changed, and we need to
                // create a new statusWidget
                statusIndicator.targetWidget = widget;
            }
            return statusIndicator;
        }
    };
}());
