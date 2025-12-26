import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';

let originalGetInitialResultSet = null;

const TrancodeGrkToEngDict = {
    ';': 'q',
    'ς': 'w',
    'ε': 'e',
    'ρ': 'r',
    'τ': 't',
    'υ': 'y',
    'θ': 'u',
    'ι': 'i',
    'ο': 'o',
    'π': 'p',
    'α': 'a',
    'σ': 's',
    'δ': 'd',
    'φ': 'f',
    'γ': 'g',
    'η': 'h',
    'ξ': 'j',
    'κ': 'k',
    'λ': 'l',
    'ζ': 'z',
    'χ': 'x',
    'ψ': 'c',
    'ω': 'v',
    'β': 'b',
    'ν': 'n',
    'μ': 'm',
};

const TrancodeEngToGrkDict = {};

function generateIvertedDict(sourceDict, destDict) {
    for (const key in sourceDict)
        destDict[sourceDict[key]] = key;
}

function transcode(source, dict) {
    source = source.toLowerCase();
    let result = '';
    for (let i = 0; i < source.length; i++) {
        const char = source.charAt(i);
        result += dict[char] ?? char;
    }
    return result;
}

async function getResultSet(terms, cancellable) {
    const query = terms.join(' ');
    const usage = Shell.AppUsage.get_default();
    
    const searchQueries = [
        query,
        transcode(query, TrancodeGrkToEngDict),
        transcode(query, TrancodeEngToGrkDict),
    ];
    
    const seen = new Set();
    const results = [];
    
    for (const searchQuery of searchQueries) {
        const groups = Gio.DesktopAppInfo.search(searchQuery);
        
        // Flatten the 2D array
        for (const group of groups) {
            for (const appID of group) {
                if (seen.has(appID))
                    continue;
                
                const app = Gio.DesktopAppInfo.new(appID);
                if (!app || !app.should_show())
                    continue;
                
                seen.add(appID);
                results.push(appID);
            }
        }
    }
    
    results.sort((a, b) => usage.compare(a, b));
    
    return results;
}

export default class GrkEngSearchExtension {
    enable() {
        generateIvertedDict(TrancodeGrkToEngDict, TrancodeEngToGrkDict);
        
        originalGetInitialResultSet =
            AppDisplay.AppSearchProvider.prototype.getInitialResultSet;
        AppDisplay.AppSearchProvider.prototype.getInitialResultSet =
            getResultSet;
    }
    
    disable() {
        if (originalGetInitialResultSet) {
            AppDisplay.AppSearchProvider.prototype.getInitialResultSet =
                originalGetInitialResultSet;
            originalGetInitialResultSet = null;
        }
    }
}
