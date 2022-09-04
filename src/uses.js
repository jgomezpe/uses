var uses = null // Main manager object, set to an object when Uses constructor is called

/**
 * Main class for loading javascript files and dependencies (as a hierarchy of javascript files - import)
 */
class Uses{
    /**
     * 
     * @param {*} root id for the root script 
     * @param {*} dependency Initially loaded dependencies if available
     * @param {*} url Location of javascript files without path (by default the same as the web page). If a javascript uses
     * some relative path it will use the webpage path anyway (not in the path defined by this argument)
     */
	constructor(root, dependency={}, url='./'){
        uses = this
        this.root = root
		this.dependency = dependency
		this.url = url
	}

    /**
     * Checks the initial non-comment position on a javascript code
     * @param {*} code Javascript code
     * @returns Initial non-comment position on a javascript code
     */
	start( code ){
		var i=0
		var flag = true
		var space = ' \t\n\r\f\v\u00A0\u2028\u2029'
		while(flag){
			while(i<code.length && space.indexOf(code.charAt(i))>=0) i++
			flag = (i+1<code.length && code.charAt(i)=='/')
			if(flag){
				i++
				switch(code.charAt(i)){
					case '/':
						i++
						while(i<code.length && code.charAt(i)!='\n' && code.charAt(i)!='\r') i++
					break;
					case '*':
						i++
						while(i+1<code.length && (code.charAt(i)!='*' || code.charAt(i+1)!='/')) i++
						if(i+1==code.length){
							flag = false
							i=0
						}else i+=2
					break;
					default:
						flag = false
						i=0
				}
			}
		}
		return i
	}

    /**
     * Gets the first runnable line of code
     * @param {*} code Javascript code to analyze
     * @param {*} i Initial position of non-comment code
     * @returns First runnable line of code
     */
	firstline(code, i){
		var j=i+1
		while(j<code.length && code.charAt(j)!='\n' && code.charAt(j)!='\r') j++
		return code.substring(i,j)
	}

	/**
	 * Loads the given script (if possible)
	 * @param code Script code
	 */
	 script(code){
		var element = document.createElement( 'script' )
		element.type = 'text/javascript'
		element.appendChild(document.createTextNode(code))
		document.body.appendChild(element)
	}

    /**
     * Returns the array of arguments passed to the function
     * @returns The array of arguments passed to the function
     */
	get(){ return arguments }

    /**
     * Determines if the javascript code requires other javascript files (analyzes the first line)
     * @param {*} line First line of the javascript file
     * @returns an array of the required javascript files (dependencies)
     */
	requires(line){ 
		if(line.startsWith('uses(')) return eval('uses.get' + line.substring(4,line.length))
		else return []			
	}

    /**
     * Adds a dependency between two javascript files
     * @param {*} caller Javascript code calling another javascript file
     * @param {*} id Javascript code being called
     */
	add_dependency(caller, id){
		var x = this
		x.dependency[caller] = x.dependency[caller] || []
		var i=0
		while(i<x.dependency[caller].length && x.dependency[caller][i] != id) i++
		if(i==x.dependency[caller].length) x.dependency[caller].push(id)
	}

    /**
     * Removes a dependency between two javascript files when satisfied
     * @param {*} caller Javascript code calling another javascript file
     * @param {*} id Javascript code being called
     * @returns true if the caller javascript does not have anymore dependencies to satisfy, false otherwise
     */
	del_dependency(caller, id){
		var x = this
		var i=0
		while(i<x.dependency[caller].length && x.dependency[caller][i] != id) i++
		if(i<x.dependency[caller].length) x.dependency[caller].splice(i,1)
		return x.dependency[caller].length == 0
	}

	/**
	 * Loads a javascript
	 * @param id Javascript to load (if necessary)
	 * @param caller Javascript requesting the javascript
	 * @param callback Function that will be called when the javascript is loaded and run
	 */
	load(id, caller, callback){
		if(id===null) return
		var x = this
		x.add_dependency(caller,id)
		if( caller==x.root || x.dependency[id] === undefined ){
			x.dependency[id] = x.dependency[id] || []

			function init(code){
				var i=x.start(code)
				var line = x.firstline(code,i)
				var plugins = x.requires(line)
				var n = plugins.length
				if(n > 0){
					code = code.substring(i+line.length, code.length)
					for(var k=0; k<n;k++){
						x.load(plugins[k], id, function(plug){
							if(x.del_dependency(id,plug)){
								x.script(code)
								callback(id)
							}
						})
					}
				}else{
					x.script(code)
                    x.dependency[id] = 'loaded'
					callback(id)
				}
			}
            var url = ((id.indexOf('/') < 0)?x.url:'')+id
            if(!url.endsWith('.js')) url += '.js'
			fetch(url).then((response) => response.text()).then((code) => init(code)).catch(error => console.error('Error:', error))
		}else{
			function check(){
				if(typeof x.dependency[id]!=='string') setTimeout(check, 100)
				else callback(id)	
			}
			check()
		}
	}

    /**
     * Loads a set of javascripts files that are required by another javascript
     * @param {*} caller Javascript requesting the javascript
     * @param {*} ids Set of Javascript to load (if necessary)
     * @param {*} callback Function to call after loading all dependencies of the caller
     */
    uses(caller, ids, callback){
        var x = this
		for( var i=0; i<ids.length; i++ ) x.load(ids[i], caller, function(plug){
			if(x.del_dependency(caller,plug)) callback(caller)
		})
    }
}
