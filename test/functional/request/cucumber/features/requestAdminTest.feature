# Tests fonctionnels de Road2 prenant en compte la donnée 
Feature: Road2 with data
  Tests fonctionnels de Road2 prenant en compte la donnée 

  Background:
      Given I have loaded all my test configuration

  Scenario Outline: [admin/1.0.0] Une route qui n'existe pas 
    Given an "HTTP" "<method>" request on "/admin/1.0.0/test"
    And with query parameters:
      | key       | value           |
      | test      | other           |
    When I send the request 
    Then the server should send a response with status 404
    And the response should contain "Not found"
  Examples:
    | method  |
    | GET     |
    | POST    | 

  Scenario: [admin/1.0.0] Version de Road2
    Given an "HTTP" "GET" request on "/admin/1.0.0/version"
    When I send the request 
    Then the server should send a response with status 200
    And the response should contain "version"

  Scenario: [admin/1.0.0] Version de Road2 avec un mauvais parametre
    Given an "HTTP" "GET" request on "/admin/1.0.0/version"
    And with query parameters:
      | key       | value           |
      | test      | other           |
    When I send the request 
    Then the server should send a response with status 200
    And the response should contain "version"

  Scenario: [admin/1.0.0] Version de Road2 en POST ne marche pas
    Given an "HTTP" "POST" request on "/admin/1.0.0/version"
    And with query parameters:
      | key       | value           |
      | test      | other           |
    When I send the request 
    Then the server should send a response with status 404
    And the response should contain "Not found"