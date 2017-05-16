# ToucanJS website

## Web root
Symlink this folder to your web root directory:

```
\public\
```

## Supported browsers
Chrome	Edge	Firefox		IExplorer	Opera	Safari
24		12		44			11			17		10

## Toucan WS

http://tomcat.esat.kuleuven.be/axis/ToucanSOAPService.jws?wsdl

##  New features

* get sequences => server-side job (e.g. via twoBitToFa)
* continuous track => upload & parse bigWig (how to position them in current graph ?)
* feature actions => move to foreground / background, center (?)
* jobs => queue, status, link to GFF files, show / hide related features from GFF
* cluster buster => bed / fasta, motif locator integration
* motif collector 20k => search interface in PWM catalogue, service
* exports: fasta, bed, gff, bigWig, workspace, image
* twoBit files locally to use twoBitToFa (?)
* info for files, regions, features
* context menu
* grouping of features per TF, name, file
* system log


## CR's

* offcanvas sidebar => proposal : fix sidebar with tabs, possibility to have multiple tabs open simultanously
* get sequences => web worker ?
* rename sequences on cut ?
* support BED files
* when region is hidden => disable reverse and move
* when region (or file ?) is hidden => share its space amongst rest of displayed regions
* add search mousehoover info


## PR's

* brushing on one axis changes the other
* toggles (show/hide, swap, move, color change) causes zoom reset
* on rare occasions scope.options are not saved after file upload

