angular.module("ToucanJS")
.factory("Workspace", function WorkspaceFactory($resource) {
    return $resource("api/workspace/:id", {id: '@ID'});
})
.factory("File", function FileFactory($resource) {
    return $resource("api/file/", {});
});
